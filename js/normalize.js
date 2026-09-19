/**
 * Flattens cluster leaves and mixed node shapes into a uniform D3 hierarchy.
 */
export function normalizeMammalTree(raw) {
  function visit(node, inherited = {}) {
    const color = node.color || inherited.color || "#8a9a8e";
    const clade = node.clade || inherited.clade || "root";
    const base = {
      id: node.scientific || node.name,
      label: node.name,
      nickname: node.nickname || null,
      scientific: node.scientific || node.name,
      color,
      clade,
      banner: Boolean(node.banner),
      cluster: node.cluster ?? null,
      image: node.image || null,
      credit: node.credit || null,
    };

    const childSources = [];

    if (node.children?.length) {
      childSources.push(...node.children);
    }
    if (node.leaves?.length) {
      node.leaves.forEach((leaf, i) => {
        childSources.push({
          ...leaf,
          name: leaf.name,
          scientific: leaf.scientific,
          color,
          clade,
          cluster: node.cluster,
          leafIndex: i,
        });
      });
    }

    if (!childSources.length) {
      return { ...base, children: undefined };
    }

    return {
      ...base,
      children: childSources.map((c) => visit(c, { color, clade })),
    };
  }

  return visit(raw);
}
