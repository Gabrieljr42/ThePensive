import { basin, books, materials } from "./manifest.mjs";

const failures = [];

function check(condition, message) {
  console.log(`${condition ? "ok" : "FAIL"} — ${message}`);
  if (!condition) failures.push(message);
}

const stone = materials.stone;
const liquid = materials.liquid;
const brass = materials.brass;
const wood = materials.wood;
const leather = materials.leather;
const paper = materials.paper;

console.log(
  `stone roughness ${stone.roughness} is higher than liquid roughness ${liquid.roughness}`,
);
check(
  stone.roughness > liquid.roughness,
  "stone roughness higher than liquid roughness",
);

console.log(
  `brass metalness ${brass.metalness} is higher than wood ${wood.metalness} and leather ${leather.metalness}`,
);
check(
  brass.metalness > wood.metalness && brass.metalness > leather.metalness,
  "brass metalness higher than wood and leather",
);

console.log(
  `leather (${leather.roughness}, ${leather.color}), paper (${paper.roughness}, ${paper.color}), and wood (${wood.roughness}, ${wood.color}) are not equal to each other`,
);
check(
  leather.roughness !== paper.roughness &&
    leather.roughness !== wood.roughness &&
    paper.roughness !== wood.roughness &&
    leather.color !== paper.color &&
    leather.color !== wood.color &&
    paper.color !== wood.color,
  "leather, paper, and wood not equal",
);

console.log(`liquid view-dependent highlight: ${liquid.viewDependentHighlight}`);
check(
  liquid.viewDependentHighlight === true,
  "liquid marked for a view-dependent highlight",
);

check(
  stone.relief === true &&
    wood.relief === true &&
    leather.relief === true &&
    stone.bumpScale > 0 &&
    wood.bumpScale > 0 &&
    leather.bumpScale > 0,
  "stone, wood, and leather carry relief",
);

const heights = books.map((book) => book.height);
const colors = books.map((book) => book.color);
console.log(`books ${books.length}`);
console.log(`heights ${heights.join(", ")}`);
console.log(`colors ${colors.join(", ")}`);
check(books.length >= 6, "at least 6 book entries");
check(
  new Set(heights).size > 1 && new Set(colors).size > 1,
  "books are not identical in height and color",
);

const near = books.filter((book) => book.near);
check(near.length > 0, "at least one near book");
for (const book of near) {
  const listed = book.parts.join(", ");
  console.log(`near book ${book.id} includes boards, spine, and pages: ${listed}`);
  check(
    book.parts.includes("boards") &&
      book.parts.includes("spine") &&
      book.parts.includes("pages"),
    `${book.id} includes boards, spine, and pages`,
  );
}

console.log("basin entry includes pedestal, rim, and liquid");
check(Boolean(basin.pedestal), "basin pedestal");
check(Boolean(basin.rim), "basin rim");
check(Boolean(basin.liquid), "basin liquid");
check(
  basin.rim.outerRadius > basin.rim.innerRadius && basin.rim.thickness > 0,
  "rim is thick and wider than the hollow",
);
check(
  basin.liquid.radius < basin.rim.innerRadius,
  "liquid sits inside the rim",
);
check(basin.pedestal.height > 0 && basin.pedestal.height < 0.5, "pedestal is short");

if (failures.length) {
  console.error(`failed ${failures.length}`);
  process.exit(1);
}
console.log("passed");
