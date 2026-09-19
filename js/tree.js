import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { normalizeMammalTree } from "./normalize.js";

const NODE_R = 28;
const BANNER_H = 52;
const MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };

export async function initMammalTree(container) {
  const raw = await fetch("./data/mammals.json").then((r) => r.json());
  const rootData = normalizeMammalTree(raw);
  const root = d3.hierarchy(rootData);
  root.descendants().forEach((d, i) => {
    d.id = d.data.id || `n-${i}`;
  });

  const svg = d3.select(container).select("svg");
  const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");
  const g = svg.select("g.zoom-root");
  const linkLayer = g.select("g.links");
  const bannerLayer = g.select("g.banners");
  const nodeLayer = g.select("g.nodes");

  const treeLayout = d3
    .tree()
    .nodeSize([76, 210])
    .separation((a, b) => (a.parent === b.parent ? 1.08 : 1.32));

  let nodes = [];
  let links = [];
  let zoomBehavior;

  function layout() {
    const w = container.clientWidth;
    const h = Math.max(900, window.innerHeight - 120);
    svg.attr("viewBox", [0, 0, w, h]);

    treeLayout(root);
    nodes = root.descendants();
    links = root.links();

    const xExtent = d3.extent(nodes, (d) => d.x);
    const dx = xExtent[1] - xExtent[0];
    const initial = d3.zoomIdentity
      .translate(MARGIN.left + 20, (h - dx) / 2 - xExtent[0])
      .scale(Math.min(1.15, (h - MARGIN.top - MARGIN.bottom) / (dx + 100)));

    svg.call(zoomBehavior.transform, initial);
    render();
    updatePositions();
  }

  zoomBehavior = d3
    .zoom()
    .scaleExtent([0.12, 3])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoomBehavior);

  const drag = d3
    .drag()
    .on("start", (event) => event.sourceEvent?.stopPropagation())
    .on("drag", (event, d) => {
      d.x += event.dy;
      d.y += event.dx;
      updatePositions();
    });

  function linkPath(d) {
    const sx = d.source.y;
    const sy = d.source.x;
    const tx = d.target.y;
    const ty = d.target.x;
    const mx = (sx + tx) / 2;
    return `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
  }

  function linkWidth(d) {
    return Math.max(3.5, 15 - d.target.depth * 1.35);
  }

  function linkColor(d) {
    const c = d.target.data.color || "#9aa39a";
    const t = Math.min(1, d.target.depth / 4);
    return d3.interpolateRgb("#b8bdb5", c)(t);
  }

  function render() {
    linkLayer
      .selectAll("path.link")
      .data(links, (d) => d.target.id)
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", linkColor)
      .attr("stroke-width", linkWidth)
      .attr("stroke-linecap", "round")
      .attr("opacity", 0.94);

    const bannerNodes = nodes.filter((d) => d.data.banner && d.depth > 0);
    bannerLayer
      .selectAll("g.banner")
      .data(bannerNodes, (d) => d.id)
      .join("g")
      .attr("class", "banner")
      .each(function (d) {
        const gEl = d3.select(this);
        gEl.selectAll("*").remove();
        const color = d.data.color;
        const title = d.data.label;
        const nick = d.data.nickname;
        const aka = d.data.scientific;
        const w = Math.max(168, title.length * 8.5 + (nick ? 20 : 36));

        gEl
          .append("rect")
          .attr("x", -w / 2)
          .attr("y", -BANNER_H / 2)
          .attr("width", w)
          .attr("height", BANNER_H)
          .attr("rx", 11)
          .attr("fill", color);

        gEl
          .append("text")
          .attr("class", "banner-title")
          .attr("text-anchor", "middle")
          .attr("y", nick ? -8 : 0)
          .text(title);

        if (nick) {
          gEl
            .append("text")
            .attr("class", "banner-nick")
            .attr("text-anchor", "middle")
            .attr("y", 8)
            .text(nick);
        }

        gEl
          .append("text")
          .attr("class", "banner-aka")
          .attr("text-anchor", "middle")
          .attr("y", nick ? 22 : 16)
          .text(`aka ${aka}`);
      });

    const visibleNodes = nodes.filter((d) => !(d.data.banner && d.depth > 0));

    nodeLayer
      .selectAll("g.node")
      .data(visibleNodes, (d) => d.id)
      .join("g")
      .attr("class", (d) => `node depth-${d.depth}`)
      .style("cursor", "grab")
      .call(drag)
      .each(function (d) {
        const gEl = d3.select(this);
        gEl.selectAll("*").remove();

        const hasImage = Boolean(d.data.image);
        const r = NODE_R;

        gEl
          .append("circle")
          .attr("class", "node-ring")
          .attr("r", r + 3)
          .attr("fill", "#fff")
          .attr("stroke", d.data.color)
          .attr("stroke-width", 3);

        if (hasImage) {
          const clipId = `clip-${String(d.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
          let clip = defs.select(`#${clipId}`);
          if (clip.empty()) {
            clip = defs.append("clipPath").attr("id", clipId);
            clip.append("circle").attr("r", r);
          }

          gEl
            .append("image")
            .attr("href", d.data.image)
            .attr("x", -r)
            .attr("y", -r)
            .attr("width", r * 2)
            .attr("height", r * 2)
            .attr("clip-path", `url(#${clipId})`)
            .attr("preserveAspectRatio", "xMidYMid slice");
        } else if (!d.children) {
          gEl
            .append("circle")
            .attr("class", "node-fill")
            .attr("r", r)
            .attr("fill", d3.color(d.data.color).brighter(0.55));
          gEl
            .append("text")
            .attr("class", "node-initial")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .text(d.data.label.charAt(0));
        } else {
          gEl
            .append("circle")
            .attr("class", "node-fill")
            .attr("r", r * 0.55)
            .attr("fill", d.data.color);
        }

        const showCluster =
          d.data.cluster != null && (!d.children || d.children.every((c) => !c.children));
        if (showCluster) {
          gEl
            .append("circle")
            .attr("class", "cluster-badge")
            .attr("cx", r - 2)
            .attr("cy", -r + 2)
            .attr("r", 11)
            .attr("fill", "#2d3430")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);
          gEl
            .append("text")
            .attr("class", "cluster-num")
            .attr("x", r - 2)
            .attr("y", -r + 2)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .text(d.data.cluster);
        }

        if (d.depth > 0) {
          const label = d.data.label;
          gEl
            .append("text")
            .attr("class", "node-label")
            .attr("y", r + 15)
            .attr("text-anchor", "middle")
            .text(label.length > 24 ? `${label.slice(0, 22)}…` : label);
        }
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        showDetail(d.data);
      });
  }

  function updatePositions() {
    linkLayer.selectAll("path.link").attr("d", linkPath);
    bannerLayer.selectAll("g.banner").attr("transform", (d) => `translate(${d.y},${d.x})`);
    nodeLayer.selectAll("g.node").attr("transform", (d) => `translate(${d.y},${d.x})`);
  }

  const detailEl = document.getElementById("detail-panel");

  function showDetail(data) {
    detailEl.hidden = false;
    detailEl.querySelector(".detail-name").textContent = data.label;
    detailEl.querySelector(".detail-sci").textContent = data.scientific;
    const nick = detailEl.querySelector(".detail-nick");
    if (data.nickname) {
      nick.textContent = data.nickname;
      nick.hidden = false;
    } else {
      nick.hidden = true;
    }
    const img = detailEl.querySelector(".detail-img");
    const credit = detailEl.querySelector(".detail-credit");
    if (data.image) {
      img.src = data.image;
      img.hidden = false;
      credit.textContent = data.credit ? `Image: ${data.credit}` : "Image: Wikimedia Commons";
    } else {
      img.hidden = true;
      credit.textContent = "";
    }
  }

  document.getElementById("detail-close")?.addEventListener("click", () => {
    detailEl.hidden = true;
  });

  layout();
  window.addEventListener("resize", layout);

  return { resetView: () => layout() };
}
