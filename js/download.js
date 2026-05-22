const repo = "knotq-app/knotq-app";
const releasesUrl = `https://github.com/${repo}/releases`;
const buttons = [...document.querySelectorAll("[data-download-button]")];
const explicitLinks = {
  arm: document.querySelector("[data-download-arm]"),
  intel: document.querySelector("[data-download-intel]"),
  windows: document.querySelector("[data-download-windows]"),
};
const copyButtons = [...document.querySelectorAll("[data-copy-command]")];

function isLinux() {
  return /Linux/i.test(navigator.userAgent || "");
}

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
      return macArmAsset(assets);
    }
    return macIntelAsset(assets) || macArmAsset(assets);
  }
  if (/Windows/i.test(ua)) return windowsInstallerAsset(assets) || windowsMsixAsset(assets);
  return macArmAsset(assets) || assets[0];
}

function macArmAsset(assets) {
  return assets.find((asset) => /macos-arm64.*\.dmg$/i.test(asset.name));
}

function macIntelAsset(assets) {
  return assets.find((asset) => /macos-x86_64.*\.dmg$/i.test(asset.name));
}

function windowsMsixAsset(assets) {
  return assets.find((asset) => /windows-x64.*\.msix$/i.test(asset.name));
}

function windowsInstallerAsset(assets) {
  return assets.find((asset) => /windows-x64-setup\.exe$/i.test(asset.name));
}

function setLink(element, asset, label) {
  if (!element || !asset) return;
  element.href = asset.browser_download_url;
  element.textContent = label;
  element.removeAttribute("aria-disabled");
}

function copyTextFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (_) {
      copyTextFallback(text);
      return;
    }
  }
  copyTextFallback(text);
}

function wireCopyButtons() {
  copyButtons.forEach((button) => {
    const label = button.getAttribute("aria-label") || "Copy command";
    button.addEventListener("click", async () => {
      const target = document.querySelector(button.dataset.copyCommand);
      const text = target?.textContent?.trim();
      if (!text) return;

      try {
        await copyText(text);
        button.classList.add("is-copied");
        button.setAttribute("aria-label", "Copied Linux install command");
        button.title = "Copied";
        setTimeout(() => {
          button.classList.remove("is-copied");
          button.setAttribute("aria-label", label);
          button.title = "Copy command";
        }, 1600);
      } catch (_) {
        button.title = "Copy failed";
      }
    });
  });
}

async function wireDownload() {
  if (!buttons.length) return;
  const linux = isLinux();

  if (linux) {
    setButtons("#download", "Install on Linux");
  } else {
    setButtons(releasesUrl, `Download for ${platformLabel()}`);
  }

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
    const arm = macArmAsset(assets);
    const intel = macIntelAsset(assets);
    const windowsInstaller = windowsInstallerAsset(assets);
    const windows = windowsInstaller || windowsMsixAsset(assets);

    setLink(explicitLinks.arm, arm, "Apple Silicon");
    setLink(explicitLinks.intel, intel, "Intel Mac");
    setLink(
      explicitLinks.windows,
      windows,
      windowsInstaller ? "Download installer" : "Download MSIX",
    );

    if (chosen && !linux) {
      setButtons(chosen.browser_download_url, `Download ${release.tag_name || "latest"}`);
    }
  } catch (_) {
    return;
  }
}

wireCopyButtons();
wireDownload();
