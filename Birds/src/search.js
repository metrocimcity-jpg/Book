import { el, clear } from "./util/dom.js";
import { flattenIndex, searchIndex } from "./util/tree.js";

export function createSearch(input, listbox, root) {
  const items = flattenIndex(root);
  const listeners = new Map();
  let results = [];
  let active = -1;

  function emit(name, detail) {
    for (const fn of listeners.get(name) || []) fn(detail);
  }

  function close() {
    listbox.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function render() {
    clear(listbox);
    if (!results.length) {
      close();
      return;
    }
    listbox.hidden = false;
    input.setAttribute("aria-expanded", "true");
    let lastRank = null;
    results.forEach((item, i) => {
      if (item.rank !== lastRank) {
        listbox.append(el("li", { class: "search-group", role: "presentation", text: item.rank }));
        lastRank = item.rank;
      }
      const id = `search-opt-${i}`;
      const option = el("li", {
        id,
        role: "option",
        class: "search-option",
        "aria-selected": i === active ? "true" : "false"
      }, [
        el("span", { text: item.common ? `${item.name} · ${item.common}` : item.name }),
        el("span", { class: "lineage", text: item.path.join(" › ") })
      ]);
      option.addEventListener("mousedown", (event) => {
        event.preventDefault();
        choose(item);
      });
      listbox.append(option);
    });
    if (active >= 0) input.setAttribute("aria-activedescendant", `search-opt-${active}`);
  }

  function choose(item) {
    emit("select", item);
    input.value = item.name;
    close();
  }

  input.addEventListener("input", () => {
    results = searchIndex(items, input.value);
    active = results.length ? 0 : -1;
    render();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!results.length) return;
      active = (active + 1) % results.length;
      render();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!results.length) return;
      active = (active - 1 + results.length) % results.length;
      render();
    } else if (event.key === "Enter") {
      if (active >= 0 && results[active]) {
        event.preventDefault();
        choose(results[active]);
      }
    } else if (event.key === "Escape") {
      close();
      input.blur();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-combobox")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== input && event.target.tagName !== "INPUT") {
      event.preventDefault();
      input.focus();
    }
  });

  return {
    on(name, fn) {
      const list = listeners.get(name) || [];
      list.push(fn);
      listeners.set(name, list);
    },
    close
  };
}
