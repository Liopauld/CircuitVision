import { COMPONENTS } from '../data/components.js';

// GET /api/catalog?category=esp32 — static reference catalog of known
// components and their basic specs. No DB and no inference: it lets the scanner
// turn a recognized board category into a concrete component pick that carries
// real specs. Omit `category` to get the whole catalog.
export async function listCatalog(req, res) {
  const { category } = req.query;
  const components = category
    ? COMPONENTS.filter((c) => c.category === category)
    : COMPONENTS;
  res.json({ components });
}
