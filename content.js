const keywords = {
  green: [
    "remote"
  ],
  red: [
    "united kingdom",
    "UK"
  ],
  blue: [
    "hybrid",
    "onsite",
    "on-site",
    "on site"
  ]
};

function highlightText(node) {
  if (
    node.parentElement &&
    (
      node.parentElement.tagName === "SCRIPT" ||
      node.parentElement.tagName === "STYLE" ||
      node.parentElement.tagName === "TEXTAREA" ||
      node.parentElement.tagName === "INPUT"
    )
  ) {
    return;
  }

  const text = node.nodeValue;

  const allKeywords = [
    ...keywords.green.map(word => ({
      word,
      color: "green"
    })),
    ...keywords.red.map(word => ({
      word,
      color: "red"
    })),
    ...keywords.blue.map(word => ({
      word,
      color: "blue"
    }))
  ];

  const regex = new RegExp(
    `\\b(${allKeywords
      .map(item => item.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})\\b`,
    "gi"
  );

  if (!regex.test(text)) return;

  regex.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  text.replace(regex, (match, _, offset) => {
    const before = text.slice(lastIndex, offset);

    if (before) {
      fragment.appendChild(document.createTextNode(before));
    }

    const span = document.createElement("span");

    const keywordData = allKeywords.find(
      item => item.word.toLowerCase() === match.toLowerCase()
    );

    span.className = `job-highlight job-highlight-${keywordData.color}`;
    span.textContent = match;

    fragment.appendChild(span);

    lastIndex = offset + match.length;
  });

  const after = text.slice(lastIndex);

  if (after) {
    fragment.appendChild(document.createTextNode(after));
  }

  node.parentNode.replaceChild(fragment, node);
}

function highlightPage() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT
  );

  const nodes = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  nodes.forEach(highlightText);
}

highlightPage();


// Listen for extension icon click
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "highlightAgain") {
    highlightPage();
  }
});