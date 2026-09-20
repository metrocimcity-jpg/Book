/**
 * Zoomable sunburst for the bird taxonomy.
 * Zoom interpolation follows Mike Bostock's Zoomable Sunburst
 * (https://observablehq.com/@d3/zoomable-sunburst), ISC License:
 * Copyright 2018–2021 Observable, Inc.
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 */

import { colorForNode, orderColorMap } from "./palette.js";
import { motionDuration } from "./util/dom.js";
import { formatNumber } from "./util/format.js";
import { isExtinctNode } from "./util/tree.js";

export function createSunburst(container, data, options = {}) {
  const d3 = globalThis.d3;
  const listeners = new Map();
  const state = {
    data,
    sizing: options.sizing || "species",
    credits: options.credits || {},
    width: options.width || Math.min(container.clientWidth || 640, 900),
    focus: null,
    hierarchyRoot: null,
    destroyed: false
  };

  const svg = d3
    .select(container)
    .append("svg")
    .attr("role", "img")
    .attr("aria-label", "Zoomable sunburst of bird taxonomy")
    .style("max-width", "100%")
    .style("height", "auto")
    .style("font", "11px var(--font-sans)");

  const g = svg.append("g");
  const defs = svg.append("defs");
  defs
    .append("pattern")
    .attr("id", "extinct-hatch")
    .attr("patternUnits", "userSpaceOnUse")
    .attr("width", 6)
    .attr("height", 6)
    .append("path")
    .attr("d", "M0,6 L6,0")
    .attr("stroke", "currentColor")
    .attr("stroke-width", 1)
    .attr("opacity", 0.45);

  defs.append("clipPath").attr("id", "centre-clip").append("circle");

  const pathLayer = g.append("g").attr("class", "arcs");
  const labelLayer = g.append("g")
    .attr("class", "labels")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle");
  const centre = g.append("g").attr("class", "centre");

  centre
    .append("circle")
    .attr("class", "centre-hit")
    .style("cursor", "pointer")
    .attr("fill", "var(--paper-raised)")
    .attr("stroke", "var(--rule)");

  centre
    .append("image")
    .attr("class", "centre-art")
    .attr("clip-path", "url(#centre-clip)")
    .attr("preserveAspectRatio", "xMidYMid slice")
    .style("pointer-events", "none");

  const centreCaption = centre
    .append("text")
    .attr("class", "centre-caption")
    .attr("text-anchor", "middle")
    .style("font-family", "var(--font-serif)")
    .style("fill", "var(--ink)")
    .style("pointer-events", "none");

  let pathSel;
  let labelSel;
  let parentSel;
  let arc;
  let radius;

  function emit(name, detail) {
    for (const fn of listeners.get(name) || []) fn(detail);
  }

  function valueFn() {
    if (state.sizing === "equal") {
      return (d) => (d.children ? 0 : 1);
    }
    return (d) => d.value ?? (d.species ? d.species.length : 0);
  }

  function layout(source) {
    const hierarchy = d3.hierarchy(source).sum(valueFn()).sort((a, b) => b.value - a.value);
    const root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(hierarchy);
    root.each((d) => {
      d.current = d.current ?? { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
    });
    return root;
  }

  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    if (d.y1 > 3 || d.y0 < 1 || d.x1 <= d.x0) return false;
    const angle = d.x1 - d.x0;
    const midR = ((d.y0 + d.y1) / 2) * (radius || 80);
    const nameLen = String(d.data?.name || "").length;
    return midR * angle > nameLen * 6.2 + 10;
  }

  function labelTransform(d) {
    const x = ((d.x0 + d.x1) / 2) * 180 / Math.PI;
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  function titleFor(d) {
    const rank = d.data.rank ? d.data.rank.charAt(0).toUpperCase() + d.data.rank.slice(1) : "Taxon";
    return `${rank} ${d.data.name} · ${formatNumber(Math.round(d.value))} species`;
  }

  function creditFor(name) {
    return state.credits[name] || null;
  }

  function applySize() {
    const width = state.width;
    radius = width / 6;
    svg
      .attr("viewBox", `${-width / 2} ${-width / 2} ${width} ${width}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));
    defs.select("#centre-clip circle").attr("r", radius * 0.8);
    centre.select(".centre-hit").attr("r", radius);
    centre
      .select(".centre-art")
      .attr("x", -radius * 0.8)
      .attr("y", -radius * 0.8)
      .attr("width", radius * 1.6)
      .attr("height", radius * 1.6);
  }

  function updateCentre(p) {
    const name = p.data.name;
    const credit = creditFor(name);
    centre.select(".centre-art").attr("href", credit?.file || "assets/img/placeholder.svg");
    const lines = [
      p === state.hierarchyRoot ? name : `↰ ${name}`,
      p.data.rank || "",
      `${formatNumber(Math.round(p.value))} species`
    ];
    const sel = centreCaption.selectAll("tspan").data(lines);
    sel.join("tspan")
      .attr("x", 0)
      .attr("dy", (d, i) => (i === 0 ? radius * 0.92 : "1.15em"))
      .style("font-size", (d, i) => (i === 0 ? "13px" : "10px"))
      .text((d) => d);
    centre.select(".centre-hit")
      .attr("tabindex", p === state.hierarchyRoot ? null : "0")
      .attr("aria-label", p === state.hierarchyRoot ? "Aves" : `Zoom out to ${p.parent?.data?.name || "Aves"}`);
  }

  function targetsFrom(p) {
    state.hierarchyRoot.each((d) => {
      d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      };
    });
  }

  function clicked(event, p) {
    if (event) {
      event.stopPropagation();
      event.currentTarget?.blur?.();
    }
    if (!p) return;
    focusNode(p, { animate: true, source: "click" });
    emit("select", p);
  }

  function paint(animate) {
    const duration = animate ? motionDuration() : 0;
    const t = svg.transition().duration(duration);
    parentSel.datum(state.focus.parent || state.hierarchyRoot);
    pathSel
      .transition(t)
      .tween("data", (d) => {
        const i = d3.interpolate(d.current, d.target);
        return (u) => { d.current = i(u); };
      })
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
      .attr("fill-opacity", (d) => (arcVisible(d.target) ? (d.children ? 0.72 : 0.55) : 0))
      .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
      .attrTween("d", (d) => () => arc(d.current));

    labelSel
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      })
      .transition(t)
      .attr("fill-opacity", (d) => +labelVisible(d.target))
      .attr("stroke-opacity", (d) => +labelVisible(d.target))
      .attrTween("transform", (d) => () => labelTransform(d.current));
  }

  function focusNode(p, { animate = true, source = "api" } = {}) {
    if (!p) return;
    state.focus = p;
    targetsFrom(p);
    if (!animate) {
      state.hierarchyRoot.each((d) => { d.current = { ...d.target }; });
    }
    paint(animate);
    updateCentre(p);
    emit("focus", p);
  }

  function bind(root) {
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#f3eee2";
    const orderNames = (root.children || []).map((d) => d.data.name);
    const colors = orderColorMap(orderNames);

    pathSel = pathLayer
      .selectAll("path")
      .data(root.descendants().slice(1), (d) => d.data.name + (d.parent?.data?.name || ""))
      .join("path")
      .attr("fill", (d) => colorForNode(d, colors, bg))
      .attr("fill-opacity", (d) => (arcVisible(d.current) ? (d.children ? 0.72 : 0.55) : 0))
      .attr("d", (d) => arc(d.current))
      .attr("tabindex", (d) => (arcVisible(d.current) ? "0" : null))
      .attr("role", "img")
      .attr("aria-label", titleFor)
      .style("cursor", "pointer")
      .on("click", clicked)
      .on("mouseenter", (event, d) => emit("hover", d))
      .on("mouseleave", () => emit("hover", null))
      .on("keydown", (event, d) => {
        if (event.key === "Enter") clicked(event, d);
        if (event.key === "Escape") focusNode(state.focus.parent || root, { animate: true });
      });

    pathSel.selectAll("title").data((d) => [d]).join("title").text(titleFor);
    pathSel.classed("extinct", (d) => isExtinctNode(d.data));
    pathSel.attr("stroke", (d) => (isExtinctNode(d.data) ? "url(#extinct-hatch)" : null));

    labelSel = labelLayer
      .selectAll("text")
      .data(root.descendants().slice(1), (d) => d.data.name + (d.parent?.data?.name || ""))
      .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", (d) => +labelVisible(d.current))
      .attr("stroke-opacity", (d) => +labelVisible(d.current))
      .attr("transform", (d) => labelTransform(d.current))
      .style("fill", "var(--ink)")
      .style("paint-order", "stroke")
      .style("stroke", "var(--paper)")
      .style("stroke-width", "2px")
      .style("text-rendering", "optimizeLegibility")
      .each(function (d) {
        const wide = d.depth === 1 && (d.x1 - d.x0) > 0.18;
        const sel = d3.select(this);
        sel.selectAll("tspan").remove();
        sel.append("tspan").attr("x", 0).text(d.data.name);
        if (wide && d.data.common) {
          sel.append("tspan").attr("x", 0).attr("dy", "1.1em").text(d.data.common);
        }
      });

    parentSel = centre.select(".centre-hit").datum(root).on("click", (event, d) => {
      const target = state.focus.parent || root;
      clicked(event, target);
    });
  }

  function rebuild(source, keepPath = []) {
    applySize();
    const root = layout(source);
    state.hierarchyRoot = root;
    root.each((d) => { d.current = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 }; });
    bind(root);
    let next = root;
    for (const name of keepPath) {
      const found = (next.children || []).find((c) => c.data.name === name);
      if (!found) break;
      next = found;
    }
    focusNode(next, { animate: false, source: "rebuild" });
  }

  rebuild(state.data);

  const observer = new ResizeObserver((entries) => {
    const w = Math.min(entries[0].contentRect.width || state.width, 900);
    if (!w || Math.abs(w - state.width) < 2) return;
    const path = [];
    let n = state.focus;
    while (n && n.parent) {
      path.unshift(n.data.name);
      n = n.parent;
    }
    state.width = w;
    rebuild(state.data, path);
  });
  observer.observe(container);

  return {
    focus(nodeOrData) {
      if (!nodeOrData) return;
      if (nodeOrData.ancestors) {
        focusNode(nodeOrData, { animate: true });
        return;
      }
      const names = [];
      const collect = (dNode) => {
        if (!dNode || dNode === state.data) return;
        names.unshift(dNode.name);
      };
      if (Array.isArray(nodeOrData)) {
        rebuild(state.data, nodeOrData);
        return;
      }
      collect(nodeOrData);
      const match = state.hierarchyRoot.descendants().find((d) => d.data === nodeOrData || d.data.name === nodeOrData.name);
      if (match) focusNode(match, { animate: true });
    },
    on(name, fn) {
      const list = listeners.get(name) || [];
      list.push(fn);
      listeners.set(name, list);
      return () => listeners.set(name, (listeners.get(name) || []).filter((f) => f !== fn));
    },
    destroy() {
      state.destroyed = true;
      observer.disconnect();
      svg.remove();
    },
    setRoot(next, keepPath = []) {
      state.data = next;
      rebuild(next, keepPath);
    },
    setSizing(sizing) {
      state.sizing = sizing;
      const path = [];
      let n = state.focus;
      while (n && n.parent) {
        path.unshift(n.data.name);
        n = n.parent;
      }
      rebuild(state.data, path);
    },
    getFocus() {
      return state.focus;
    },
    getRoot() {
      return state.hierarchyRoot;
    }
  };
}
