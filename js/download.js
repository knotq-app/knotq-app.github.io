const repo = "knotq-app/knotq-app";
const releasesUrl = `https://github.com/${repo}/releases`;
const buttons = [...document.querySelectorAll("[data-download-button]")];
const status = document.querySelector("[data-download-status]");
const explicitLinks = {
  arm: document.querySelector("[data-download-arm]"),
  intel: document.querySelector("[data-download-intel]"),
};

function setButtons(href, label) {
  buttons.forEach((button) => {
    button.href = href;
    button.textContent = label;
  });
}

function platformLabel() {
  const ua = navigator.userAgent || "";
  if (/Mac/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "your platform";
}

async function architecture() {
  if (navigator.userAgentData?.getHighEntropyValues) {
    try {
      const values = await navigator.userAgentData.getHighEntropyValues(["architecture"]);
      return (values.architecture || "").toLowerCase();
    } catch (_) {
      return "";
    }
  }
  return "";
}

function pickAsset(assets, arch) {
  const ua = navigator.userAgent || "";
  if (/Mac/i.test(ua)) {
    if (/arm|aarch64/.test(arch)) {
      return assets.find((asset) => /macos-arm64/i.test(asset.name));
    }
    return (
      assets.find((asset) => /macos-x86_64/i.test(asset.name)) ||
      assets.find((asset) => /macos-arm64/i.test(asset.name))
    );
  }
  if (/Windows/i.test(ua)) return assets.find((asset) => /windows/i.test(asset.name));
  if (/Linux/i.test(ua)) return assets.find((asset) => /linux/i.test(asset.name));
  return assets.find((asset) => /macos-arm64/i.test(asset.name)) || assets[0];
}

function setLink(element, asset, label) {
  if (!element || !asset) return;
  element.href = asset.browser_download_url;
  element.textContent = label;
  element.removeAttribute("aria-disabled");
}

async function wireDownload() {
  if (!buttons.length) return;
  setButtons(releasesUrl, `Download for ${platformLabel()}`);
  if (status) status.textContent = "Looking up the latest release...";

  try {
    const [arch, response] = await Promise.all([
      architecture(),
      fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json" },
      }),
    ]);
    if (!response.ok) throw new Error("release unavailable");

    const release = await response.json();
    const assets = release.assets || [];
    const chosen = pickAsset(assets, arch);
    const arm = assets.find((asset) => /macos-arm64/i.test(asset.name));
    const intel = assets.find((asset) => /macos-x86_64/i.test(asset.name));

    setLink(explicitLinks.arm, arm, "Apple Silicon");
    setLink(explicitLinks.intel, intel, "Intel Mac");

    if (chosen) {
      setButtons(chosen.browser_download_url, `Download ${release.tag_name || "latest"}`);
      if (status) status.textContent = `${chosen.name} selected for ${platformLabel()}.`;
    } else if (status) {
      status.textContent = "No direct asset found yet. Opening GitHub releases.";
    }
  } catch (_) {
    if (status) status.textContent = "No release asset is available yet. Opening GitHub releases.";
  }
}

wireDownload();
