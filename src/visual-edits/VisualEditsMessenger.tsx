"use client";

import { useEffect, useState, useRef } from "react";

export const CHANNEL = "ORCHIDS_HOVER_v1" as const;
const VISUAL_EDIT_MODE_KEY = "orchids_visual_edit_mode" as const;
const FOCUSED_ELEMENT_KEY = "orchids_focused_element" as const;

// Deduplicate helper for high-frequency traffic (HIT / FOCUS_MOVED / SCROLL)
// -----------------------------------------------------------------------------
let _orchidsLastMsg = "";
const postMessageDedup = (data: any) => {
  try {
    const key = JSON.stringify(data);
    if (key === _orchidsLastMsg) return; // identical – drop
    _orchidsLastMsg = key;
  } catch {
    // if stringify fails, fall through
  }
  window.parent.postMessage(data, "*");
};

export type ParentToChild =
  | { type: typeof CHANNEL; msg: "POINTER"; x: number; y: number }
  | { type: typeof CHANNEL; msg: "VISUAL_EDIT_MODE"; active: boolean }
  | { type: typeof CHANNEL; msg: "SCROLL"; dx: number; dy: number }
  | { type: typeof CHANNEL; msg: "CLEAR_INLINE_STYLES"; elementId: string }
  | {
      type: typeof CHANNEL;
      msg: "PREVIEW_FONT";
      elementId: string;
      fontFamily: string;
    }
  | {
      type: typeof CHANNEL;
      msg: "RESIZE_ELEMENT";
      elementId: string;
      width: number;
      height: number;
    }
  | {
      type: typeof CHANNEL;
      msg: "SHOW_ELEMENT_HOVER";
      elementId: string | null;
    };

export type ChildToParent =
  | {
      type: typeof CHANNEL;
      msg: "HIT";
      id: string | null;
      tag: string | null;
      rect: { top: number; left: number; width: number; height: number } | null;
    }
  | {
      type: typeof CHANNEL;
      msg: "ELEMENT_CLICKED";
      id: string | null;
      tag: string | null;
      rect: { top: number; left: number; width: number; height: number };
      clickPosition: { x: number; y: number };
      isEditable?: boolean;
      currentStyles?: {
        fontSize?: string;
        color?: string;
        fontWeight?: string;
        fontStyle?: string;
        textDecoration?: string;
        textAlign?: string;
        lineHeight?: string;
        letterSpacing?: string;
        paddingLeft?: string;
        paddingRight?: string;
        paddingTop?: string;
        paddingBottom?: string;
        marginLeft?: string;
        marginRight?: string;
        marginTop?: string;
        marginBottom?: string;
        backgroundColor?: string;
        backgroundImage?: string;
        borderRadius?: string;
        fontFamily?: string;
        opacity?: string;
        display?: string;
        flexDirection?: string;
        alignItems?: string;
        justifyContent?: string;
        gap?: string;
      };
      className?: string;
      src?: string;
    }
  | { type: typeof CHANNEL; msg: "SCROLL_STARTED" }
  | { type: typeof CHANNEL; msg: "SCROLL_STOPPED" }
  | {
      type: typeof CHANNEL;
      msg: "TEXT_CHANGED";
      id: string;
      oldText: string;
      newText: string;
      filePath: string;
      line: number;
      column: number;
    }
  | {
      type: typeof CHANNEL;
      msg: "STYLE_CHANGED";
      id: string;
      styles: Record<string, string>;
      filePath: string;
      line: number;
      column: number;
    }
  | {
      type: typeof CHANNEL;
      msg: "STYLE_BLUR";
      id: string;
      styles: Record<string, string>;
      filePath: string;
      line: number;
      column: number;
      className: string;
    }
  | {
      type: typeof CHANNEL;
      msg: "IMAGE_BLUR";
      id: string;
      oldSrc: string;
      newSrc: string;
      filePath: string;
      line: number;
      column: number;
    }
  | {
      type: typeof CHANNEL;
      msg: "FOCUS_MOVED";
      id: string;
      rect: { top: number; left: number; width: number; height: number };
    }
  | { type: typeof CHANNEL; msg: "VISUAL_EDIT_MODE_ACK"; active: boolean }
  | { type: typeof CHANNEL; msg: "VISUAL_EDIT_MODE_RESTORED"; active: boolean };

type Box = null | { top: number; left: number; width: number; height: number };

const BOX_PADDING = 4;

const isTextEditable = (element: HTMLElement): boolean => {
  const tagName = element.tagName.toLowerCase();
  const editableTags = [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "div",
    "li",
    "td",
    "th",
    "label",
    "a",
    "button",
  ];

  if (
    element.contentEditable === "true" ||
    tagName === "input" ||
    tagName === "textarea"
  ) {
    return true;
  }

  if (editableTags.includes(tagName) && element.textContent?.trim()) {
    const hasDirectText = Array.from(element.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    );

    if (
      element.childElementCount === 0 ||
      (element.childElementCount <= 1 && hasDirectText)
    ) {
      return true;
    }
  }

  return false;
};

const extractDirectTextContent = (element: HTMLElement): string => {
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || "";
    }
  }
  return text;
};

const parseOrchidsId = (
  orchidsId: string
): { filePath: string; line: number; column: number } | null => {
  const parts = orchidsId.split(":");
  if (parts.length < 3) return null;

  const column = parseInt(parts.pop() || "0");
  const line = parseInt(parts.pop() || "0");
  const filePath = parts.join(":");

  if (isNaN(line) || isNaN(column)) return null;

  return { filePath, line, column };
};

const getCurrentStyles = (
  element: HTMLElement
): {
  fontSize?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  lineHeight?: string;
  letterSpacing?: string;
  paddingLeft?: string;
  paddingRight?: string;
  paddingTop?: string;
  paddingBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  marginTop?: string;
  marginBottom?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  borderRadius?: string;
  fontFamily?: string;
  opacity?: string;
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
} => {
  const computed = window.getComputedStyle(element);

  const normalizeValue = (value: string, property: string): string => {
    if (property === "backgroundColor") {
      if (
        value === "rgba(0, 0, 0, 0)" ||
        value === "rgb(0, 0, 0, 0)" ||
        value === "transparent" ||
        value === ""
      ) {
        return "transparent";
      }
    }

    if (property === "backgroundImage" && (value === "none" || value === "")) {
      return "none";
    }

    if (property === "textDecoration") {
      if (value.includes("none") || value === "") {
        return "none";
      }
    }

    if (property === "fontStyle" && (value === "normal" || value === "")) {
      return "normal";
    }

    if (property === "fontWeight") {
      const weight = parseInt(value);
      if (!isNaN(weight)) {
        return String(weight);
      }
      return value || "400";
    }

    if (property === "opacity" && (value === "1" || value === "")) {
      return "1";
    }

    if (
      (property.includes("padding") || property.includes("margin")) &&
      (value === "0px" || value === "0")
    ) {
      return "0";
    }

    if (property === "borderRadius" && (value === "0px" || value === "0")) {
      return "0";
    }

    if (
      property === "letterSpacing" &&
      (value === "normal" || value === "0px")
    ) {
      return "normal";
    }

    if (property === "gap" && (value === "normal" || value === "0px")) {
      return "normal";
    }

    return value;
  };

  return {
    fontSize: normalizeValue(computed.fontSize, "fontSize"),
    color: normalizeValue(computed.color, "color"),
    fontWeight: normalizeValue(computed.fontWeight, "fontWeight"),
    fontStyle: normalizeValue(computed.fontStyle, "fontStyle"),
    textDecoration: normalizeValue(computed.textDecoration, "textDecoration"),
    textAlign: normalizeValue(computed.textAlign, "textAlign"),
    lineHeight: normalizeValue(computed.lineHeight, "lineHeight"),
    letterSpacing: normalizeValue(computed.letterSpacing, "letterSpacing"),
    paddingLeft: normalizeValue(computed.paddingLeft, "paddingLeft"),
    paddingRight: normalizeValue(computed.paddingRight, "paddingRight"),
    paddingTop: normalizeValue(computed.paddingTop, "paddingTop"),
    paddingBottom: normalizeValue(computed.paddingBottom, "paddingBottom"),
    marginLeft: normalizeValue(computed.marginLeft, "marginLeft"),
    marginRight: normalizeValue(computed.marginRight, "marginRight"),
    marginTop: normalizeValue(computed.marginTop, "marginTop"),
    marginBottom: normalizeValue(computed.marginBottom, "marginBottom"),
    backgroundColor: normalizeValue(
      computed.backgroundColor,
      "backgroundColor"
    ),
    backgroundImage: normalizeValue(
      computed.backgroundImage,
      "backgroundImage"
    ),
    borderRadius: normalizeValue(computed.borderRadius, "borderRadius"),
    fontFamily: normalizeValue(computed.fontFamily, "fontFamily"),
    opacity: normalizeValue(computed.opacity, "opacity"),
    display: normalizeValue(computed.display, "display"),
    flexDirection: normalizeValue(computed.flexDirection, "flexDirection"),
    alignItems: normalizeValue(computed.alignItems, "alignItems"),
    justifyContent: normalizeValue(computed.justifyContent, "justifyContent"),
    gap: normalizeValue(computed.gap, "gap"),
  };
};

const normalizeImageSrc = (input: string): string => {
  if (!input) return "";
  try {
    const url = new URL(input, window.location.origin);
    if (url.pathname === "/_next/image") {
      const real = url.searchParams.get("url");
      if (real) return decodeURIComponent(real);
    }
    return url.href;
  } catch {
    return input;
  }
};

const wrapMultiline = (text: string): string => {
  if (text.includes("\n")) {
    const escaped = text.replace(/\n/g, "\\n");
    return `{\`${escaped}\`}`;
  }
  return text;
};

export default function HoverReceiver() {
  const [hoverBox, setHoverBox] = useState<Box>(null);
  const [hoverBoxes, setHoverBoxes] = useState<Box[]>([]);
  const [focusBox, setFocusBox] = useState<Box>(null);
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);
  const [isVisualEditMode, setIsVisualEditMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(VISUAL_EDIT_MODE_KEY);
      return stored === "true";
    }
    return false;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const [hoverTag, setHoverTag] = useState<string | null>(null);
  const [focusTag, setFocusTag] = useState<string | null>(null);
  const isResizingRef = useRef(false);
  const lastHitElementRef = useRef<HTMLElement | null>(null);
  const lastHitIdRef = useRef<string | null>(null);
  const focusedElementRef = useRef<HTMLElement | null>(null);
  const isVisualEditModeRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const originalContentRef = useRef<string>("");
  const originalSrcRef = useRef<string>("");
  const focusedImageElementRef = useRef<HTMLImageElement | null>(null);
  const editingElementRef = useRef<HTMLElement | null>(null);
  const wasEditableRef = useRef<boolean>(false);
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const originalStylesRef = useRef<Record<string, string>>({});
  const appliedStylesRef = useRef<Map<string, Record<string, string>>>(
    new Map()
  );
  const hasStyleChangesRef = useRef<boolean>(false);
  const lastClickTimeRef = useRef<number>(0);
  const pendingCleanupRef = useRef<NodeJS.Timeout | null>(null);

  const loadedFontFamilies = useRef<Set<string>>(new Set());
  const persistentFontMap = useRef<Map<string, string>>(new Map());
  const persistentFontTimeouts = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    isVisualEditModeRef.current = isVisualEditMode;
    if (typeof window !== "undefined") {
      localStorage.setItem(VISUAL_EDIT_MODE_KEY, String(isVisualEditMode));
    }
  }, [isVisualEditMode]);

  useEffect(() => {
    if (isVisualEditMode) {
      window.parent.postMessage(
        { type: CHANNEL, msg: "VISUAL_EDIT_MODE_ACK", active: true },
        "*"
      );

      window.parent.postMessage(
        { type: CHANNEL, msg: "VISUAL_EDIT_MODE_RESTORED", active: true },
        "*"
      );

      setTimeout(() => {
        if (typeof window !== "undefined") {
          const focusedData = localStorage.getItem(FOCUSED_ELEMENT_KEY);
          if (focusedData) {
            try {
              const { id } = JSON.parse(focusedData);
              const element = document.querySelector(
                `[data-orchids-id="${id}"]`
              ) as HTMLElement;

              if (element) {
                const rect = element.getBoundingClientRect();
                const clickEvent = new MouseEvent("click", {
                  clientX: rect.left + rect.width / 2,
                  clientY: rect.top + rect.height / 2,
                  bubbles: true,
                  cancelable: true,
                });
                element.dispatchEvent(clickEvent);
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }, 500);
    }
  }, []);

  const expandBox = (rect: DOMRect): Box => ({
    top: rect.top - BOX_PADDING,
    left: rect.left - BOX_PADDING,
    width: rect.width + BOX_PADDING * 2,
    height: rect.height + BOX_PADDING * 2,
  });

  const updateFocusBox = () => {
    if (focusedElementRef.current) {
      const r = focusedElementRef.current.getBoundingClientRect();
      setFocusBox(expandBox(r));
    }
  };

  useEffect(() => {
    if (isVisualEditMode && !styleElementRef.current) {
      const style = document.createElement("style");
      style.textContent = `
        [contenteditable="true"]:focus {
          outline: none !important;
          box-shadow: none !important;
          border-color: inherit !important;
        }
        [contenteditable="true"] {
          cursor: text !important;
        }
        [contenteditable="true"]::selection {
          background-color: rgba(59, 130, 246, 0.3);
        }
        [contenteditable="true"]::-moz-selection {
          background-color: rgba(59, 130, 246, 0.3);
        }
        [contenteditable="true"] [contenteditable="false"] {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          opacity: 0.7 !important;
          cursor: default !important;
        }
        [data-orchids-protected="true"] {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
      `;
      document.head.appendChild(style);
      styleElementRef.current = style;
    } else if (!isVisualEditMode && styleElementRef.current) {
      styleElementRef.current.remove();
      styleElementRef.current = null;
    }

    return () => {
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = null;
      }
    };
  }, [isVisualEditMode]);

  const protectChildElements = (element: HTMLElement) => {
    const childElements = element.querySelectorAll("*");
    childElements.forEach((child) => {
      const childEl = child as HTMLElement;
      childEl.contentEditable = "false";
      childEl.setAttribute("data-orchids-protected", "true");
      childEl.style.userSelect = "none";
      childEl.style.webkitUserSelect = "none";
    });
  };

  const restoreChildElements = (element: HTMLElement) => {
    const protectedElements = element.querySelectorAll(
      '[data-orchids-protected="true"]'
    );
    protectedElements.forEach((child) => {
      const childEl = child as HTMLElement;
      childEl.removeAttribute("contenteditable");
      childEl.removeAttribute("data-orchids-protected");
      childEl.style.userSelect = "";
      childEl.style.webkitUserSelect = "";
    });
  };

  const handleTextChange = (element: HTMLElement) => {
    if (element !== editingElementRef.current) {
      console.warn("Attempting to handle text change for non-editing element");
      return;
    }

    const orchidsId = element.getAttribute("data-orchids-id");
    if (!orchidsId) return;

    let newText: string;
    let oldText: string;

    if (element.childElementCount > 0) {
      newText = extractDirectTextContent(element);
      oldText = originalContentRef.current;
    } else {
      newText = element.innerText || element.textContent || "";
      oldText = originalContentRef.current;
    }

    if (newText !== oldText) {
      const parsed = parseOrchidsId(orchidsId);
      if (!parsed) return;

      const msg: ChildToParent = {
        type: CHANNEL,
        msg: "TEXT_CHANGED",
        id: orchidsId,
        oldText: wrapMultiline(oldText),
        newText: wrapMultiline(newText),
        filePath: parsed.filePath,
        line: parsed.line,
        column: parsed.column,
      };

      postMessageDedup(msg);

      originalContentRef.current = newText;
    }
  };

  const handleStyleChange = (
    element: HTMLElement,
    styles: Record<string, string>
  ) => {
    const orchidsId = element.getAttribute("data-orchids-id");
    if (!orchidsId) return;

    const parsed = parseOrchidsId(orchidsId);
    if (!parsed) return;

    const allMatchingElements = document.querySelectorAll(
      `[data-orchids-id="${orchidsId}"]`
    ) as NodeListOf<HTMLElement>;

    allMatchingElements.forEach((el) => {
      Object.entries(styles).forEach(([property, value]) => {
        const cssProp = property.replace(/([A-Z])/g, "-$1").toLowerCase();

        let finalValue = value;

        if (
          property === "backgroundColor" &&
          (value === "transparent" ||
            value === "rgba(0, 0, 0, 0)" ||
            value === "rgb(0, 0, 0, 0)")
        ) {
          finalValue = "transparent";
        }

        if (
          (property === "backgroundColor" && finalValue === "transparent") ||
          (property === "backgroundImage" && value === "none") ||
          (property === "textDecoration" && value === "none") ||
          (property === "fontStyle" && value === "normal") ||
          (property === "opacity" && value === "1") ||
          ((property.includes("padding") || property.includes("margin")) &&
            value === "0") ||
          (property === "borderRadius" && value === "0") ||
          (property === "letterSpacing" && value === "normal") ||
          (property === "gap" && value === "normal")
        ) {
          el.style.removeProperty(cssProp);
        } else {
          el.style.setProperty(cssProp, finalValue, "important");
        }
      });
    });

    const existingStyles = appliedStylesRef.current.get(orchidsId) || {};
    appliedStylesRef.current.set(orchidsId, { ...existingStyles, ...styles });
    hasStyleChangesRef.current = true;

    requestAnimationFrame(() => {
      updateFocusBox();
    });
  };

  const handleStyleBlur = (element: HTMLElement) => {
    if (!hasStyleChangesRef.current) return;

    const orchidsId = element.getAttribute("data-orchids-id");
    if (!orchidsId) return;

    const parsed = parseOrchidsId(orchidsId);
    if (!parsed) return;

    const appliedStyles = appliedStylesRef.current.get(orchidsId);
    if (!appliedStyles || Object.keys(appliedStyles).length === 0) return;

    const className = element.getAttribute("class") || "";

    const msg: ChildToParent = {
      type: CHANNEL,
      msg: "STYLE_BLUR",
      id: orchidsId,
      styles: appliedStyles,
      className,
      filePath: parsed.filePath,
      line: parsed.line,
      column: parsed.column,
    };

    postMessageDedup(msg);

    hasStyleChangesRef.current = false;
  };

  const flushImageSrcChange = () => {
    const imgElement = focusedImageElementRef.current;
    if (!imgElement) return;

    const orchidsId = imgElement.getAttribute("data-orchids-id");
    if (!orchidsId) return;

    const parsed = parseOrchidsId(orchidsId);
    if (!parsed) return;

    const newSrc = normalizeImageSrc(imgElement.src);
    const oldSrc = normalizeImageSrc(originalSrcRef.current);

    if (!newSrc || newSrc === oldSrc) return;

    const msg: ChildToParent = {
      type: CHANNEL,
      msg: "IMAGE_BLUR",
      id: orchidsId,
      oldSrc,
      newSrc,
      filePath: parsed.filePath,
      line: parsed.line,
      column: parsed.column,
    };

    postMessageDedup(msg);

    originalSrcRef.current = newSrc;
    focusedImageElementRef.current = null;
  };

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "ORCHIDS_STYLE_UPDATE") {
        const { elementId, styles } = e.data;

        const allMatchingElements = document.querySelectorAll(
          `[data-orchids-id="${elementId}"]`
        ) as NodeListOf<HTMLElement>;

        if (allMatchingElements.length > 0) {
          const fam = styles.fontFamily || styles["fontFamily"];
          if (fam) {
            const familyKey = fam.replace(/['\s]+/g, "+");
            if (!loadedFontFamilies.current.has(familyKey)) {
              const link = document.createElement("link");
              link.rel = "stylesheet";
              link.href = `https://fonts.googleapis.com/css2?family=${familyKey}:wght@400&display=swap`;
              document.head.appendChild(link);
              loadedFontFamilies.current.add(familyKey);
            }
          }

          if (fam) {
            persistentFontMap.current.set(elementId, fam);

            const existingTimeout =
              persistentFontTimeouts.current.get(elementId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }

            const timeoutId = window.setTimeout(() => {
              persistentFontMap.current.delete(elementId);
              persistentFontTimeouts.current.delete(elementId);
            }, 2000);

            persistentFontTimeouts.current.set(elementId, timeoutId);
          }

          allMatchingElements.forEach((element) => {
            if (focusedElementRef.current === element) {
              handleStyleChange(element, styles);
            } else {
              Object.entries(styles).forEach(([property, value]) => {
                const cssProp = property
                  .replace(/([A-Z])/g, "-$1")
                  .toLowerCase();

                let finalValue = String(value);

                if (
                  property === "backgroundColor" &&
                  (value === "transparent" ||
                    value === "rgba(0, 0, 0, 0)" ||
                    value === "rgb(0, 0, 0, 0)")
                ) {
                  finalValue = "transparent";
                }

                if (
                  (property === "backgroundColor" &&
                    finalValue === "transparent") ||
                  (property === "backgroundImage" && value === "none") ||
                  (property === "textDecoration" && value === "none") ||
                  (property === "fontStyle" && value === "normal") ||
                  (property === "opacity" && value === "1") ||
                  ((property.includes("padding") ||
                    property.includes("margin")) &&
                    value === "0") ||
                  (property === "borderRadius" && value === "0") ||
                  (property === "letterSpacing" && value === "normal") ||
                  (property === "gap" && value === "normal")
                ) {
                  element.style.removeProperty(cssProp);
                } else {
                  element.style.setProperty(cssProp, finalValue, "important");
                }
              });
            }
          });
        }
      } else if (e.data?.type === "ORCHIDS_IMAGE_UPDATE") {
        const { elementId, src, oldSrc } = e.data;
        let element: HTMLImageElement | null = null;
        const candidates = document.querySelectorAll(
          `[data-orchids-id="${elementId}"]`
        );
        candidates.forEach((el) => {
          if (el.tagName.toLowerCase() === "img") {
            const img = el as HTMLImageElement;
            const norm = normalizeImageSrc(img.src);
            if (!element) element = img;
            if (oldSrc && normalizeImageSrc(oldSrc) === norm) {
              element = img;
            }
          }
        });

        if (!element) return;

        if ((element as HTMLElement).tagName.toLowerCase() === "img") {
          const imgEl = element as HTMLImageElement;

          {
            imgEl.removeAttribute("srcset");
            imgEl.srcset = "";

            imgEl.src = src;

            originalSrcRef.current = normalizeImageSrc(src);
            focusedImageElementRef.current = imgEl;

            imgEl.onload = () => updateFocusBox();
          }
        }
      } else if (e.data?.type === "RESIZE_ELEMENT") {
        const { elementId, width, height } = e.data;
        const element = document.querySelector(
          `[data-orchids-id="${elementId}"]`
        ) as HTMLElement;

        if (element && focusedElementRef.current === element) {
          element.style.setProperty("width", `${width}px`, "important");
          element.style.setProperty("height", `${height}px`, "important");

          updateFocusBox();
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    if (!focusedElementRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = focusedElementRef.current.getBoundingClientRect();

    setHoverBox(null);
    lastHitElementRef.current = null;

    document.body.style.pointerEvents = "none";
    const resizeHandles = document.querySelectorAll(".resize-handle");
    resizeHandles.forEach((handle) => {
      (handle as HTMLElement).style.pointerEvents = "auto";
    });

    setIsResizing(true);
    isResizingRef.current = true;
    setResizeHandle(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    });
  };

  useEffect(() => {
    if (
      !isResizing ||
      !resizeStart ||
      !resizeHandle ||
      !focusedElementRef.current
    )
      return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;

      if (resizeHandle.includes("e")) newWidth = resizeStart.width + dx;
      if (resizeHandle.includes("w")) newWidth = resizeStart.width - dx;
      if (resizeHandle.includes("s")) newHeight = resizeStart.height + dy;
      if (resizeHandle.includes("n")) newHeight = resizeStart.height - dy;

      const parent = focusedElementRef.current?.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const parentStyles = window.getComputedStyle(parent);
        const parentPaddingLeft = parseFloat(parentStyles.paddingLeft) || 0;
        const parentPaddingRight = parseFloat(parentStyles.paddingRight) || 0;
        const parentPaddingTop = parseFloat(parentStyles.paddingTop) || 0;
        const parentPaddingBottom = parseFloat(parentStyles.paddingBottom) || 0;

        const maxWidth =
          parentRect.width - parentPaddingLeft - parentPaddingRight;
        const maxHeight =
          parentRect.height - parentPaddingTop - parentPaddingBottom;

        const exceedsWidth = newWidth > maxWidth;
        const exceedsHeight = newHeight > maxHeight;

        newWidth = Math.max(
          20,
          exceedsWidth ? newWidth : Math.min(newWidth, maxWidth)
        );

        newHeight = Math.max(
          20,
          exceedsHeight ? newHeight : Math.min(newHeight, maxHeight)
        );
      } else {
        newWidth = Math.max(20, newWidth);
        newHeight = Math.max(20, newHeight);
      }

      if (hoverBox) {
        setHoverBox(null);
      }

      if (focusedElementId) {
        window.parent.postMessage(
          {
            type: CHANNEL,
            msg: "RESIZE_ELEMENT",
            elementId: focusedElementId,
            width: Math.round(newWidth),
            height: Math.round(newHeight),
          },
          "*"
        );
      }
    };

    const handleMouseUp = () => {
      if (focusedElementRef.current && focusedElementId) {
        const element = focusedElementRef.current;
        const computedStyle = window.getComputedStyle(element);
        const width = parseFloat(computedStyle.width) || element.offsetWidth;
        const height = parseFloat(computedStyle.height) || element.offsetHeight;

        const maxWidth = computedStyle.maxWidth;
        const maxHeight = computedStyle.maxHeight;
        const hasMaxWidth =
          maxWidth && maxWidth !== "none" && maxWidth !== "initial";
        const hasMaxHeight =
          maxHeight && maxHeight !== "none" && maxHeight !== "initial";

        const parent = element.parentElement;
        let widthValue = `${Math.round(width)}px`;
        let heightValue = `${Math.round(height)}px`;

        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const parentStyles = window.getComputedStyle(parent);
          const parentPaddingLeft = parseFloat(parentStyles.paddingLeft) || 0;
          const parentPaddingRight = parseFloat(parentStyles.paddingRight) || 0;
          const parentPaddingTop = parseFloat(parentStyles.paddingTop) || 0;
          const parentPaddingBottom =
            parseFloat(parentStyles.paddingBottom) || 0;

          const parentInnerWidth =
            parentRect.width - parentPaddingLeft - parentPaddingRight;
          const parentInnerHeight =
            parentRect.height - parentPaddingTop - parentPaddingBottom;

          const widthPercent = (width / parentInnerWidth) * 100;
          const heightPercent = (height / parentInnerHeight) * 100;

          if (
            Math.abs(widthPercent - Math.round(widthPercent)) < 0.1 ||
            [25, 33.333, 50, 66.667, 75, 100].some(
              (v) => Math.abs(widthPercent - v) < 0.5
            )
          ) {
            widthValue = `${Math.round(widthPercent * 10) / 10}%`;
          }

          if (
            Math.abs(heightPercent - Math.round(heightPercent)) < 0.1 &&
            [25, 50, 75, 100].includes(Math.round(heightPercent))
          ) {
            heightValue = `${Math.round(heightPercent)}%`;
          }
        }

        const styles: Record<string, string> = {};

        styles.width = widthValue;
        styles.height = heightValue;

        if (hasMaxWidth) {
          styles.maxWidth = widthValue;
        }

        if (hasMaxHeight) {
          styles.maxHeight = heightValue;
        }

        const msg: ChildToParent = {
          type: CHANNEL,
          msg: "STYLE_BLUR",
          id: focusedElementId,
          styles,
          filePath: "",
          line: 0,
          column: 0,
          className: element.getAttribute("class") || "",
        };

        const orchidsId = element.getAttribute("data-orchids-id");
        if (orchidsId) {
          const parsed = parseOrchidsId(orchidsId);
          if (parsed) {
            msg.filePath = parsed.filePath;
            msg.line = parsed.line;
            msg.column = parsed.column;
          }
        }

        window.parent.postMessage(msg, "*");
      }

      setIsResizing(false);
      isResizingRef.current = false;
      setResizeHandle(null);
      setResizeStart(null);

      document.body.style.pointerEvents = "";

      lastHitElementRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStart, resizeHandle, focusedElementId, hoverBox]);

  const cleanupEditingElement = () => {
    if (editingElementRef.current) {
      const element = editingElementRef.current;

      editingElementRef.current = null;

      handleStyleBlur(element);

      handleTextChange(element);

      if (element.childElementCount > 0) {
        restoreChildElements(element);
      }

      if (!wasEditableRef.current) {
        element.contentEditable = "false";
      }

      const currentStyle = element.getAttribute("style") || "";
      const cleanedStyle = currentStyle
        .replace(/outline:\s*none\s*!important;?/gi, "")
        .replace(/box-shadow:\s*none\s*!important;?/gi, "")
        .trim()
        .replace(/;\s*;/g, ";")
        .replace(/^;|;$/g, "");

      if (cleanedStyle) {
        element.setAttribute("style", cleanedStyle);
      } else {
        element.removeAttribute("style");
      }

      element.blur();

      const handlers = (element as any)._editHandlers;
      if (handlers) {
        element.removeEventListener("focus", handlers.focus);
        element.removeEventListener("blur", handlers.blur);
        element.removeEventListener("input", handlers.input);
        delete (element as any)._editHandlers;
      }

      wasEditableRef.current = false;
      originalContentRef.current = "";
    }
  };

  useEffect(() => {
    if (!isVisualEditMode) return;

    const preventLinkClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (link && !link.isContentEditable) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventFormSubmit = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener("click", preventLinkClick, true);
    document.addEventListener("submit", preventFormSubmit, true);

    return () => {
      document.removeEventListener("click", preventLinkClick, true);
      document.removeEventListener("submit", preventFormSubmit, true);
    };
  }, [isVisualEditMode]);

  useEffect(() => {
    if (!isVisualEditMode) {
      cleanupEditingElement();
      appliedStylesRef.current.clear();
      hasStyleChangesRef.current = false;

      focusedImageElementRef.current = null;
    }
  }, [isVisualEditMode]);

  useEffect(() => {
    if (focusedElementRef.current) {
      const handleUpdate = () => {
        updateFocusBox();

        if (focusedElementRef.current && focusedElementId) {
          const fr = focusedElementRef.current.getBoundingClientRect();
          const fBox = expandBox(fr);
          if (fBox) {
            const focMsg: ChildToParent = {
              type: CHANNEL,
              msg: "FOCUS_MOVED",
              id: focusedElementId,
              rect: {
                top: fBox.top,
                left: fBox.left,
                width: fBox.width,
                height: fBox.height,
              },
            };
            postMessageDedup(focMsg);
          }
        }
      };

      window.addEventListener("scroll", handleUpdate, true);
      window.addEventListener("resize", handleUpdate);

      const resizeObserver = new ResizeObserver(handleUpdate);
      resizeObserver.observe(focusedElementRef.current);

      return () => {
        window.removeEventListener("scroll", handleUpdate, true);
        window.removeEventListener("resize", handleUpdate);
        resizeObserver.disconnect();
      };
    }
  }, [focusedElementId]);

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (isResizingRef.current) {
        return;
      }
      if (!isVisualEditModeRef.current) return;

      if (isScrolling) return;

      const hit =
        document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>("[data-orchids-id]") ?? null;

      if (hit !== lastHitElementRef.current) {
        lastHitElementRef.current = hit;

        if (!hit) {
          setHoverBox(null);
          setHoverBoxes([]);
          setHoverTag(null);
          lastHitIdRef.current = null;
          flushImageSrcChange();

          const msg: ChildToParent = {
            type: CHANNEL,
            msg: "HIT",
            id: null,
            tag: null,
            rect: null,
          };
          postMessageDedup(msg);
          return;
        }

        const hitId = hit.getAttribute("data-orchids-id");

        if (hitId === lastHitIdRef.current) {
          return;
        }

        lastHitIdRef.current = hitId;

        const tagName =
          hit.getAttribute("data-orchids-name") || hit.tagName.toLowerCase();

        const allMatchingElements = document.querySelectorAll(
          `[data-orchids-id="${hitId}"]`
        ) as NodeListOf<HTMLElement>;

        const boxes: Box[] = [];
        allMatchingElements.forEach((element) => {
          const elementId = element.getAttribute("data-orchids-id");
          if (elementId === focusedElementId) {
            return;
          }

          const rect = element.getBoundingClientRect();
          boxes.push(expandBox(rect));
        });

        setHoverBoxes(boxes);

        if (hitId !== focusedElementId) {
          const r = hit.getBoundingClientRect();
          const expandedBox = expandBox(r);
          setHoverBox(expandedBox);
        } else {
          setHoverBox(null);
        }

        setHoverTag(tagName);

        const msg: ChildToParent = {
          type: CHANNEL,
          msg: "HIT",
          id: hitId,
          tag: tagName,
          rect:
            hitId !== focusedElementId
              ? expandBox(hit.getBoundingClientRect())
              : null,
        };
        postMessageDedup(msg);
      }
    }

    function onPointerLeave() {
      if (!isVisualEditModeRef.current) return;

      if (isResizingRef.current) return;

      setHoverBox(null);
      setHoverBoxes([]);
      setHoverTag(null);

      flushImageSrcChange();

      lastHitElementRef.current = null;
      lastHitIdRef.current = null;
      const msg: ChildToParent = {
        type: CHANNEL,
        msg: "HIT",
        id: null,
        tag: null,
        rect: null,
      };
      postMessageDedup(msg);
    }

    function onMouseDownCapture(e: MouseEvent) {
      if (isResizingRef.current) return;
      if (!isVisualEditModeRef.current) return;

      const hit = (e.target as HTMLElement)?.closest<HTMLElement>(
        "[data-orchids-id]"
      );

      if (hit && isTextEditable(hit)) {
        wasEditableRef.current = hit.contentEditable === "true";

        if (!wasEditableRef.current) {
          const currentStyle = hit.getAttribute("style") || "";
          hit.setAttribute(
            "style",
            `${currentStyle}; outline: none !important; box-shadow: none !important;`
          );

          hit.contentEditable = "true";

          if (hit.childElementCount > 0) {
            protectChildElements(hit);
          }
        }
      }
    }

    function onClickCapture(e: MouseEvent) {
      if (isResizingRef.current) return;
      if (!isVisualEditModeRef.current) return;

      const now = Date.now();
      if (now - lastClickTimeRef.current < 100) {
        return;
      }
      lastClickTimeRef.current = now;

      const target = e.target as HTMLElement;
      const hit = target.closest<HTMLElement>("[data-orchids-id]");

      if (hit) {
        const tagName =
          hit.getAttribute("data-orchids-name") || hit.tagName.toLowerCase();

        const hitId = hit.getAttribute("data-orchids-id");
        const isEditable = isTextEditable(hit);

        const isLink = hit.tagName.toLowerCase() === "a" || !!hit.closest("a");
        const isButton =
          hit.tagName.toLowerCase() === "button" ||
          hit.getAttribute("role") === "button";

        if (isLink || isButton || !isEditable) {
          e.preventDefault();
          e.stopPropagation();
        }

        const prevFocused = focusedElementRef.current;

        focusedElementRef.current = hit;
        setFocusedElementId(hitId);
        setFocusTag(tagName);

        if (hitId && typeof window !== "undefined") {
          const focusedElementData = {
            id: hitId,
            tag: tagName,
          };
          localStorage.setItem(
            FOCUSED_ELEMENT_KEY,
            JSON.stringify(focusedElementData)
          );
        }

        const allMatchingElements = document.querySelectorAll(
          `[data-orchids-id="${hitId}"]`
        ) as NodeListOf<HTMLElement>;

        const boxes: Box[] = [];
        allMatchingElements.forEach((element) => {
          if (element === hit) {
            return;
          }

          const rect = element.getBoundingClientRect();
          boxes.push(expandBox(rect));
        });

        setHoverBoxes(boxes);
        if (boxes.length > 0) {
          setHoverTag(tagName);
        }

        if (hit.tagName.toLowerCase() === "img") {
          focusedImageElementRef.current = hit as HTMLImageElement;
        } else {
          focusedImageElementRef.current = null;
        }

        originalStylesRef.current = getCurrentStyles(hit);

        if (isEditable) {
          if (pendingCleanupRef.current) {
            clearTimeout(pendingCleanupRef.current);
            pendingCleanupRef.current = null;
          }

          if (editingElementRef.current && editingElementRef.current !== hit) {
            editingElementRef.current.blur();
            cleanupEditingElement();
          }

          if (hit !== editingElementRef.current) {
            editingElementRef.current = hit;
            if (hit.childElementCount > 0) {
              originalContentRef.current = extractDirectTextContent(hit);
            } else {
              originalContentRef.current =
                hit.innerText || hit.textContent || "";
            }

            const createHandlers = (element: HTMLElement) => {
              const handleFocus = () => {
                if (element !== editingElementRef.current) return;

                handleStyleBlur(element);

                if (element.childElementCount > 0) {
                  originalContentRef.current =
                    extractDirectTextContent(element);
                } else {
                  originalContentRef.current =
                    element.innerText || element.textContent || "";
                }

                hasStyleChangesRef.current = false;
              };

              const handleBlur = () => {
                if (element !== editingElementRef.current) return;

                handleStyleBlur(element);
                handleTextChange(element);
              };

              const handleInput = () => {
                if (element !== editingElementRef.current) return;
              };

              return { handleFocus, handleBlur, handleInput };
            };

            const handlers = createHandlers(hit);
            hit.addEventListener("focus", handlers.handleFocus);
            hit.addEventListener("blur", handlers.handleBlur);
            hit.addEventListener("input", handlers.handleInput);

            (hit as any)._editHandlers = {
              focus: handlers.handleFocus,
              blur: handlers.handleBlur,
              input: handlers.handleInput,
            };
          }
        }

        const r = hit.getBoundingClientRect();
        const expandedBox = expandBox(r);
        setFocusBox(expandedBox);

        setHoverBox(null);

        const className = hit.getAttribute("class") || "";

        const srcRaw =
          hit.tagName.toLowerCase() === "img"
            ? (hit as HTMLImageElement).src
            : undefined;

        if (srcRaw) {
          originalSrcRef.current = normalizeImageSrc(srcRaw);
        }

        const computedStyles = getCurrentStyles(hit);

        const msg: ChildToParent = {
          type: CHANNEL,
          msg: "ELEMENT_CLICKED",
          id: hitId,
          tag: tagName,
          rect: expandedBox
            ? {
                top: expandedBox.top,
                left: expandedBox.left,
                width: expandedBox.width,
                height: expandedBox.height,
              }
            : {
                top: 0,
                left: 0,
                width: 0,
                height: 0,
              },
          clickPosition: {
            x: e.clientX,
            y: e.clientY,
          },
          isEditable,
          currentStyles: computedStyles,
          className,
          src: srcRaw,
        };

        postMessageDedup(msg);

        setTimeout(() => {
          flushImageSrcChange();

          if (prevFocused && prevFocused !== hit) {
            handleStyleBlur(prevFocused);
          }

          if (editingElementRef.current && editingElementRef.current !== hit) {
            cleanupEditingElement();
          }
        }, 0);
      } else {
        if (focusedElementRef.current) {
          flushImageSrcChange();
          handleStyleBlur(focusedElementRef.current);
          cleanupEditingElement();

          focusedElementRef.current = null;
          setFocusedElementId(null);
          setFocusTag(null);
          setFocusBox(null);
          setHoverBox(null);
          setHoverBoxes([]);
          setHoverTag(null);

          if (typeof window !== "undefined") {
            localStorage.removeItem(FOCUSED_ELEMENT_KEY);
          }

          const msg: ChildToParent = {
            type: CHANNEL,
            msg: "ELEMENT_CLICKED",
            id: null,
            tag: null,
            rect: {
              top: 0,
              left: 0,
              width: 0,
              height: 0,
            },
            clickPosition: {
              x: e.clientX,
              y: e.clientY,
            },
            isEditable: false,
            currentStyles: {},
            className: "",
          };
          postMessageDedup(msg);
        }
      }
    }

    function onMsg(e: MessageEvent<ParentToChild>) {
      if (e.data?.type !== CHANNEL) return;

      if (e.data.msg === "PREVIEW_FONT" && "elementId" in e.data) {
        const { elementId, fontFamily } = e.data;

        if (persistentFontMap.current.has(elementId)) {
          return;
        }

        const element = document.querySelector(
          `[data-orchids-id="${elementId}"]`
        ) as HTMLElement | null;
        if (!element) return;

        const familyKey = fontFamily.replace(/\s+/g, "+");
        if (!loadedFontFamilies.current.has(familyKey)) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = `https://fonts.googleapis.com/css2?family=${familyKey}:wght@400&display=swap`;
          document.head.appendChild(link);
          loadedFontFamilies.current.add(familyKey);
        }

        element.style.fontFamily = `'${fontFamily}', sans-serif`;
        return;
      }

      if (e.data.msg === "SCROLL" && "dx" in e.data && "dy" in e.data) {
        window.scrollBy(e.data.dx, e.data.dy);
      }

      if (e.data.msg === "VISUAL_EDIT_MODE" && "active" in e.data) {
        const newMode = e.data.active;
        setIsVisualEditMode(newMode);

        if (!newMode && typeof window !== "undefined") {
          localStorage.removeItem(VISUAL_EDIT_MODE_KEY);
          localStorage.removeItem(FOCUSED_ELEMENT_KEY);
        }

        window.parent.postMessage(
          { type: CHANNEL, msg: "VISUAL_EDIT_MODE_ACK", active: newMode },
          "*"
        );

        if (!newMode) {
          flushImageSrcChange();

          cleanupEditingElement();

          focusedImageElementRef.current = null;

          setHoverBox(null);
          setHoverBoxes([]);
          setFocusBox(null);
          setFocusedElementId(null);
          lastHitElementRef.current = null;
          focusedElementRef.current = null;
          hasStyleChangesRef.current = false;

          setHoverTag(null);
          setFocusTag(null);

          const msg: ChildToParent = {
            type: CHANNEL,
            msg: "HIT",
            id: null,
            tag: null,
            rect: null,
          };
          postMessageDedup(msg);
        }
      }

      if (e.data.msg === "CLEAR_INLINE_STYLES" && "elementId" in e.data) {
        const allMatchingElements = document.querySelectorAll(
          `[data-orchids-id="${e.data.elementId}"]`
        ) as NodeListOf<HTMLElement>;

        allMatchingElements.forEach((element) => {
          const stylesToClear = [
            "fontSize",
            "color",
            "fontWeight",
            "fontStyle",
            "textDecoration",
            "textAlign",
            "paddingLeft",
            "paddingRight",
            "paddingTop",
            "paddingBottom",
            "marginLeft",
            "marginRight",
            "marginTop",
            "marginBottom",
            "backgroundColor",
            "backgroundImage",
          ];

          stylesToClear.forEach((prop) => {
            (element.style as any)[prop] = "";
          });
        });

        appliedStylesRef.current.delete(e.data.elementId);
      }

      if (e.data.msg === "SHOW_ELEMENT_HOVER" && "elementId" in e.data) {
        const { elementId } = e.data;

        if (!elementId) {
          setHoverBoxes([]);
          setHoverTag(null);
          return;
        }

        const allMatchingElements = document.querySelectorAll(
          `[data-orchids-id="${elementId}"]`
        ) as NodeListOf<HTMLElement>;

        if (allMatchingElements.length > 0) {
          const boxes: Box[] = [];
          let tagName = "";

          allMatchingElements.forEach((element) => {
            if (element === focusedElementRef.current) {
              return;
            }

            const rect = element.getBoundingClientRect();
            boxes.push(expandBox(rect));

            if (!tagName) {
              tagName =
                element.getAttribute("data-orchids-name") ||
                element.tagName.toLowerCase();
            }
          });

          setHoverBoxes(boxes);
          setHoverTag(boxes.length > 0 ? tagName : null);
        }
      }
    }

    function onScroll() {
      if (isResizingRef.current) return;
      if (!isVisualEditModeRef.current) return;

      setIsScrolling(true);
      setHoverBox(null);
      setHoverBoxes([]);

      const scrollMsg: ChildToParent = {
        type: CHANNEL,
        msg: "SCROLL_STARTED",
      };
      postMessageDedup(scrollMsg);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false);
        const scrollStopMsg: ChildToParent = {
          type: CHANNEL,
          msg: "SCROLL_STOPPED",
        };
        postMessageDedup(scrollStopMsg);
      }, 16);
    }

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("mousedown", onMouseDownCapture, {
      capture: true,
    });
    document.addEventListener("click", onClickCapture, { capture: true });
    window.addEventListener("message", onMsg);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("mousedown", onMouseDownCapture, true);
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("message", onMsg);
      window.removeEventListener("scroll", onScroll, true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [focusedElementId, isResizing]);

  return (
    <>
      {isVisualEditMode && !isResizing && (
        <>
          {hoverBoxes
            .filter((box): box is NonNullable<Box> => box !== null)
            .map((box, index) => (
              <div key={index}>
                <div
                  className="fixed pointer-events-none border-[0.5px] border-[#38bdf8] bg-blue-200/20 border-dashed rounded-sm"
                  style={{
                    zIndex: 100000,
                    left: box.left,
                    top: box.top,
                    width: box.width,
                    height: box.height,
                  }}
                />
                {hoverTag && (
                  <div
                    className="fixed pointer-events-none text-[10px] text-white bg-[#38bdf8] px-1 py-0.5 rounded-sm"
                    style={{
                      zIndex: 100001,
                      left: box.left,
                      top: box.top - 20,
                    }}
                  >
                    {hoverTag}
                  </div>
                )}
              </div>
            ))}
        </>
      )}

      {isVisualEditMode && focusBox && (
        <>
          {focusTag && (
            <div
              className="fixed text-[10px] font-semibold text-white bg-[#3b82f6] px-1 rounded-sm pointer-events-none select-none"
              style={{
                zIndex: 100003,
                left: focusBox.left - 4,
                top: focusBox.top - 16,
              }}
            >
              {focusTag}
            </div>
          )}

          <div
            className="fixed pointer-events-none border-[1.5px] border-[#38bdf8] rounded-sm"
            style={{
              zIndex: 100001,
              left: focusBox.left,
              top: focusBox.top,
              width: focusBox.width,
              height: focusBox.height,
            }}
          />

          {!isResizing && (
            <>
              <div
                className="fixed w-2 h-2 bg-[#38bdf8] rounded-full cursor-nw-resize pointer-events-auto resize-handle"
                style={{
                  zIndex: 100002,
                  left: focusBox.left - 4,
                  top: focusBox.top - 4,
                }}
                onMouseDown={(e) => handleResizeStart(e, "nw")}
              />
              <div
                className="fixed w-2 h-2 bg-[#38bdf8] rounded-full cursor-ne-resize pointer-events-auto resize-handle"
                style={{
                  zIndex: 100002,
                  left: focusBox.left + focusBox.width - 4,
                  top: focusBox.top - 4,
                }}
                onMouseDown={(e) => handleResizeStart(e, "ne")}
              />
              <div
                className="fixed w-2 h-2 bg-[#38bdf8] rounded-full cursor-sw-resize pointer-events-auto resize-handle"
                style={{
                  zIndex: 100002,
                  left: focusBox.left - 4,
                  top: focusBox.top + focusBox.height - 4,
                }}
                onMouseDown={(e) => handleResizeStart(e, "sw")}
              />
              <div
                className="fixed w-2 h-2 bg-[#38bdf8] rounded-full cursor-se-resize pointer-events-auto resize-handle"
                style={{
                  zIndex: 100002,
                  left: focusBox.left + focusBox.width - 4,
                  top: focusBox.top + focusBox.height - 4,
                }}
                onMouseDown={(e) => handleResizeStart(e, "se")}
              />

              <div
                className="fixed w-2 h-2 bg-[#38bdf8] rounded-full cursor-n-resize pointer-events-auto resize-handle"
                style={{
                  zIndex: 100002,
                  left: focusBox.left + focusBox.width / 2 - 4,
                  top: focusBox.top - 4,
                }}
                onMouseDown={(e) => handleResizeStart(e, "n")}
              />
              <div
                className="fixed w-2 h-2 bg-[#38bdf8] rounded-full cursor-s-resize pointer-events-auto resize-handle"
                style={{
                  zIndex: 100002,
                  left: focusBox.left + focusBox.width / 2 - 4,
                  top: focusBox.top + focusBox.height - 4,
                }}
                onMouseDown={(e) => handleResizeStart(e, "s")}
              />
              <div
                className="fixed w-2 h-2 bg-[#38bdf8] rounded-full cursor-w-resize pointer-events-auto resize-handle"
                style={{
                  zIndex: 100002,
                  left: focusBox.left - 4,
                  top: focusBox.top + focusBox.height / 2 - 4,
                }}
                onMouseDown={(e) => handleResizeStart(e, "w")}
              />
              <div
                className="fixed w-2 h-2 bg-[#38bdf8] rounded-full cursor-e-resize pointer-events-auto resize-handle"
                style={{
                  zIndex: 100002,
                  left: focusBox.left + focusBox.width - 4,
                  top: focusBox.top + focusBox.height / 2 - 4,
                }}
                onMouseDown={(e) => handleResizeStart(e, "e")}
              />
            </>
          )}
        </>
      )}
    </>
  );
}