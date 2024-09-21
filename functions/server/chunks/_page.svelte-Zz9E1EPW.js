import { c as create_ssr_component, v as validate_component, k as escape, l as add_attribute, o as each, p as compute_rest_props, q as spread, t as escape_object } from './ssr-n0ns-7Y6.js';
import { a as auth, d as db, N as Navbar, b as backgroundImage } from './pexels-lastly-2086917-BsjB_5eG.js';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { faCheck, faTimes, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { parse, icon } from '@fortawesome/fontawesome-svg-core';
import './paths-CYDIOyak.js';
import 'firebase/app';
import 'firebase/storage';
import 'firebase/analytics';
import './client-Ce2ihRKQ.js';

function classList(props) {
  const {
    beat,
    fade,
    beatFade,
    bounce,
    shake,
    flash,
    spin,
    spinPulse,
    spinReverse,
    pulse,
    fixedWidth,
    inverse,
    border,
    listItem,
    flip,
    size,
    rotation,
    pull
  } = props;
  const classes = {
    "fa-beat": beat,
    "fa-fade": fade,
    "fa-beat-fade": beatFade,
    "fa-bounce": bounce,
    "fa-shake": shake,
    "fa-flash": flash,
    "fa-spin": spin,
    "fa-spin-reverse": spinReverse,
    "fa-spin-pulse": spinPulse,
    "fa-pulse": pulse,
    "fa-fw": fixedWidth,
    "fa-inverse": inverse,
    "fa-border": border,
    "fa-li": listItem,
    "fa-flip": flip === true,
    "fa-flip-horizontal": flip === "horizontal" || flip === "both",
    "fa-flip-vertical": flip === "vertical" || flip === "both",
    [`fa-${size}`]: typeof size !== "undefined" && size !== null,
    [`fa-rotate-${rotation}`]: typeof rotation !== "undefined" && rotation !== null && rotation !== 0,
    [`fa-pull-${pull}`]: typeof pull !== "undefined" && pull !== null,
    "fa-swap-opacity": props.swapOpacity
  };
  return Object.keys(classes).map((key) => classes[key] ? key : null).filter((key) => key);
}
function _isNumerical(obj) {
  obj = obj - 0;
  return obj === obj;
}
function camelize(string) {
  if (_isNumerical(string)) {
    return string;
  }
  string = string.replace(/[\-_\s]+(.)?/g, function(match, chr) {
    return chr ? chr.toUpperCase() : "";
  });
  return string.substr(0, 1).toLowerCase() + string.substr(1);
}
function styleToString(style) {
  if (typeof style === "string") {
    return style;
  }
  return Object.keys(style).reduce((acc, key) => acc + key.split(/(?=[A-Z])/).join("-").toLowerCase() + ":" + style[key] + ";", "");
}
function convert(createElement, element, extraProps = {}) {
  if (typeof element === "string") {
    return element;
  }
  const children = (element.children || []).map((child) => {
    return convert(createElement, child);
  });
  const mixins = Object.keys(element.attributes || {}).reduce(
    (acc, key) => {
      const val = element.attributes[key];
      if (key === "style") {
        acc.attrs["style"] = styleToString(val);
      } else {
        if (key.indexOf("aria-") === 0 || key.indexOf("data-") === 0) {
          acc.attrs[key.toLowerCase()] = val;
        } else {
          acc.attrs[camelize(key)] = val;
        }
      }
      return acc;
    },
    { attrs: {} }
  );
  return createElement(element.tag, { ...mixins.attrs }, children);
}
let PRODUCTION = false;
try {
  PRODUCTION = process.env.NODE_ENV === "production";
} catch (e) {
}
function log(...args) {
  if (!PRODUCTION && console && typeof console.error === "function") {
    console.error(...args);
  }
}
function normalizeIconArgs(icon2) {
  if (icon2 && typeof icon2 === "object" && icon2.prefix && icon2.iconName && icon2.icon) {
    return icon2;
  }
  if (parse.icon) {
    return parse.icon(icon2);
  }
  if (icon2 === null) {
    return null;
  }
  if (icon2 && typeof icon2 === "object" && icon2.prefix && icon2.iconName) {
    return icon2;
  }
  if (Array.isArray(icon2) && icon2.length === 2) {
    return { prefix: icon2[0], iconName: icon2[1] };
  }
  if (typeof icon2 === "string") {
    return { prefix: "fas", iconName: icon2 };
  }
}
function objectWithKey(key, value) {
  return Array.isArray(value) && value.length > 0 || !Array.isArray(value) && value ? { [key]: value } : {};
}
const SvgElement = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { tag } = $$props;
  let { props } = $$props;
  let { children } = $$props;
  let { style = null } = $$props;
  let { ref = null } = $$props;
  if (tag !== "svg") {
    throw new Error('SvgElement requires a tag of "svg"');
  }
  function processChildren(children2) {
    return children2?.reduce(
      (acc, child) => {
        return acc + (child.tag ? generateMarkup(child) : child);
      },
      ""
    ) || "";
  }
  function generateMarkup({ tag: tag2, props: props2, children: children2 }) {
    const attributes = Object.keys(props2).map((key) => `${key}="${props2[key]}"`).join(" ");
    return `<${tag2} ${attributes}>${processChildren(children2)}</${tag2}>`;
  }
  const markup = processChildren(children);
  const elementStyle = props?.style ? `${props.style}${style || ""}` : style;
  const elementProps = { ...props, style: elementStyle };
  if ($$props.tag === void 0 && $$bindings.tag && tag !== void 0) $$bindings.tag(tag);
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  if ($$props.children === void 0 && $$bindings.children && children !== void 0) $$bindings.children(children);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0) $$bindings.style(style);
  if ($$props.ref === void 0 && $$bindings.ref && ref !== void 0) $$bindings.ref(ref);
  return `<svg${spread([escape_object(elementProps)], {})}${add_attribute("this", ref, 0)}><!-- HTML_TAG_START -->${markup}<!-- HTML_TAG_END --></svg>`;
});
const FontAwesomeIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "border",
    "mask",
    "maskId",
    "fixedWidth",
    "inverse",
    "flip",
    "icon",
    "listItem",
    "pull",
    "pulse",
    "rotation",
    "size",
    "spin",
    "spinPulse",
    "spinReverse",
    "beat",
    "fade",
    "beatFade",
    "bounce",
    "shake",
    "symbol",
    "title",
    "titleId",
    "transform",
    "swapOpacity",
    "ref",
    "style"
  ]);
  let { border = false } = $$props;
  let { mask = null } = $$props;
  let { maskId = null } = $$props;
  let { fixedWidth = false } = $$props;
  let { inverse = false } = $$props;
  let { flip = false } = $$props;
  let { icon: icon$1 = null } = $$props;
  let { listItem = false } = $$props;
  let { pull = null } = $$props;
  let { pulse = false } = $$props;
  let { rotation = null } = $$props;
  let { size = null } = $$props;
  let { spin = false } = $$props;
  let { spinPulse = false } = $$props;
  let { spinReverse = false } = $$props;
  let { beat = false } = $$props;
  let { fade = false } = $$props;
  let { beatFade = false } = $$props;
  let { bounce = false } = $$props;
  let { shake = false } = $$props;
  let { symbol = false } = $$props;
  let { title = "" } = $$props;
  let { titleId = null } = $$props;
  let { transform = null } = $$props;
  let { swapOpacity = false } = $$props;
  let { ref = null } = $$props;
  let { style = null } = $$props;
  const iconLookup = normalizeIconArgs(icon$1);
  const classes = objectWithKey("classes", [...classList($$props), ...($$props.class || "").split(" ")]);
  const transformObj = objectWithKey("transform", typeof transform === "string" ? parse.transform(transform) : transform);
  const maskObj = objectWithKey("mask", normalizeIconArgs(mask));
  const renderedIcon = icon(iconLookup, {
    ...classes,
    ...transformObj,
    ...maskObj,
    symbol,
    title,
    titleId,
    maskId
  });
  let result = null;
  if (!renderedIcon) {
    log("Could not find icon", iconLookup);
  } else {
    const { abstract } = renderedIcon;
    result = convert(
      (tag, props, children) => {
        return { tag, props, children };
      },
      abstract[0],
      $$restProps
    );
  }
  if ($$props.border === void 0 && $$bindings.border && border !== void 0) $$bindings.border(border);
  if ($$props.mask === void 0 && $$bindings.mask && mask !== void 0) $$bindings.mask(mask);
  if ($$props.maskId === void 0 && $$bindings.maskId && maskId !== void 0) $$bindings.maskId(maskId);
  if ($$props.fixedWidth === void 0 && $$bindings.fixedWidth && fixedWidth !== void 0) $$bindings.fixedWidth(fixedWidth);
  if ($$props.inverse === void 0 && $$bindings.inverse && inverse !== void 0) $$bindings.inverse(inverse);
  if ($$props.flip === void 0 && $$bindings.flip && flip !== void 0) $$bindings.flip(flip);
  if ($$props.icon === void 0 && $$bindings.icon && icon$1 !== void 0) $$bindings.icon(icon$1);
  if ($$props.listItem === void 0 && $$bindings.listItem && listItem !== void 0) $$bindings.listItem(listItem);
  if ($$props.pull === void 0 && $$bindings.pull && pull !== void 0) $$bindings.pull(pull);
  if ($$props.pulse === void 0 && $$bindings.pulse && pulse !== void 0) $$bindings.pulse(pulse);
  if ($$props.rotation === void 0 && $$bindings.rotation && rotation !== void 0) $$bindings.rotation(rotation);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0) $$bindings.size(size);
  if ($$props.spin === void 0 && $$bindings.spin && spin !== void 0) $$bindings.spin(spin);
  if ($$props.spinPulse === void 0 && $$bindings.spinPulse && spinPulse !== void 0) $$bindings.spinPulse(spinPulse);
  if ($$props.spinReverse === void 0 && $$bindings.spinReverse && spinReverse !== void 0) $$bindings.spinReverse(spinReverse);
  if ($$props.beat === void 0 && $$bindings.beat && beat !== void 0) $$bindings.beat(beat);
  if ($$props.fade === void 0 && $$bindings.fade && fade !== void 0) $$bindings.fade(fade);
  if ($$props.beatFade === void 0 && $$bindings.beatFade && beatFade !== void 0) $$bindings.beatFade(beatFade);
  if ($$props.bounce === void 0 && $$bindings.bounce && bounce !== void 0) $$bindings.bounce(bounce);
  if ($$props.shake === void 0 && $$bindings.shake && shake !== void 0) $$bindings.shake(shake);
  if ($$props.symbol === void 0 && $$bindings.symbol && symbol !== void 0) $$bindings.symbol(symbol);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0) $$bindings.title(title);
  if ($$props.titleId === void 0 && $$bindings.titleId && titleId !== void 0) $$bindings.titleId(titleId);
  if ($$props.transform === void 0 && $$bindings.transform && transform !== void 0) $$bindings.transform(transform);
  if ($$props.swapOpacity === void 0 && $$bindings.swapOpacity && swapOpacity !== void 0) $$bindings.swapOpacity(swapOpacity);
  if ($$props.ref === void 0 && $$bindings.ref && ref !== void 0) $$bindings.ref(ref);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0) $$bindings.style(style);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `${result ? `${validate_component(SvgElement, "SvgElement").$$render(
      $$result,
      Object.assign({}, result, { style }, { ref }),
      {
        ref: ($$value) => {
          ref = $$value;
          $$settled = false;
        }
      },
      {}
    )}` : ``}`;
  } while (!$$settled);
  return $$rendered;
});
function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "N/A";
  const date = timestamp.toDate();
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
}
const Profile = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let user = null;
  let userDetails = null;
  let errorMessage = "";
  let editField = null;
  let tempValue = "";
  const fieldOrder = [
    "email",
    "phone",
    "username",
    "practiceAreas",
    "website",
    "city",
    "state",
    "createdAt"
  ];
  onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      user = currentUser;
      try {
        const userDoc = await getDoc(doc(db, "attorneyProfiles", user.uid));
        if (userDoc.exists()) {
          userDetails = userDoc.data();
        } else {
          errorMessage = "User details not found.";
        }
      } catch (error) {
        errorMessage = error.message;
      }
    } else {
      errorMessage = "No user is logged in.";
    }
  });
  return `<main class="bg-no-repeat bg-center bg-cover min-h-screen" style="${"background-image: url(" + escape(backgroundImage, true) + ")"}">${validate_component(Navbar, "Navbar").$$render($$result, {}, {}, {})} <div class="flex items-center justify-center py-8 px-4"><div class="flex flex-col md:flex-row items-start justify-center bg-zinc-800 bg-opacity-90 p-6 sm:p-8 rounded-md shadow-md w-full max-w-4xl">${userDetails ? `<div class="flex flex-col items-center md:items-start md:w-1/3 mb-6 md:mb-0"><img${add_attribute("src", userDetails.profilePictureUrl || "default-profile.png", 0)}${add_attribute("alt", userDetails.firstName + " " + userDetails.lastName, 0)} class="w-40 h-80 object-cover mb-4 rounded-md" onerror="this.src='default-profile.png';"></div> <div class="md:w-2/3 text-white"><h2 class="text-2xl sm:text-3xl font-bold mb-4">${escape(userDetails.firstName)} ${escape(userDetails.lastName)}</h2> <div class="grid grid-cols-[auto,1fr,auto] gap-x-4 gap-y-2">${each(fieldOrder, (field) => {
    return `${userDetails[field] !== void 0 ? `<div class="font-bold capitalize">${escape(field.replace(/([A-Z])/g, " $1"))}:</div> <div class="text-right">${editField === field ? `<input type="text" class="w-full p-2 rounded-md text-black"${add_attribute(
      "placeholder",
      field === "practiceAreas" ? "Separate areas with commas" : "",
      0
    )}${add_attribute("value", tempValue, 0)}>` : `${field === "practiceAreas" ? `${escape(userDetails[field].join(", "))}` : `${field === "createdAt" ? `${escape(formatDate(userDetails[field]))}` : `${escape(userDetails[field])}`}`}`}</div> <div class="flex items-center justify-end">${editField === field ? `<button class="ml-2 text-green-500">${validate_component(FontAwesomeIcon, "FontAwesomeIcon").$$render($$result, { icon: faCheck }, {}, {})}</button> <button class="ml-2 text-red-500">${validate_component(FontAwesomeIcon, "FontAwesomeIcon").$$render($$result, { icon: faTimes }, {}, {})}</button>` : `${field !== "createdAt" ? `<button class="ml-2 text-gray-500 hover:text-orange-400 transition-colors duration-200">${validate_component(FontAwesomeIcon, "FontAwesomeIcon").$$render($$result, { icon: faPencilAlt }, {}, {})} </button>` : ``}`} </div>` : ``}`;
  })} ${each(Object.keys(userDetails).filter((field) => !fieldOrder.includes(field) && !["profilePictureUrl", "firstName", "lastName"].includes(field)), (field) => {
    return `<div class="font-bold capitalize">${escape(field.replace(/([A-Z])/g, " $1"))}:</div> <div class="text-right">${editField === field ? `<input type="text" class="w-full p-2 rounded-md text-black"${add_attribute("value", tempValue, 0)}>` : `${escape(userDetails[field])}`}</div> <div class="flex items-center justify-end">${editField === field ? `<button class="ml-2 text-green-500">${validate_component(FontAwesomeIcon, "FontAwesomeIcon").$$render($$result, { icon: faCheck }, {}, {})}</button> <button class="ml-2 text-red-500">${validate_component(FontAwesomeIcon, "FontAwesomeIcon").$$render($$result, { icon: faTimes }, {}, {})}</button>` : `<button class="ml-2 text-gray-500 hover:text-orange-400 transition-colors duration-200">${validate_component(FontAwesomeIcon, "FontAwesomeIcon").$$render($$result, { icon: faPencilAlt }, {}, {})} </button>`} </div>`;
  })}</div></div>` : `${errorMessage ? `<p class="text-red-500">${escape(errorMessage)}</p>` : `<p class="text-white" data-svelte-h="svelte-1etwm58">Loading...</p>`}`}</div></div> </main>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Profile, "Profile").$$render($$result, {}, {}, {})}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-Zz9E1EPW.js.map
