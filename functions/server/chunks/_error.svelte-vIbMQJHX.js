import { c as create_ssr_component, v as validate_component, k as escape } from './ssr-n0ns-7Y6.js';
import { N as Navbar, b as backgroundImage } from './pexels-lastly-2086917-BsjB_5eG.js';
import './paths-CYDIOyak.js';
import 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/storage';
import 'firebase/analytics';
import './client-Ce2ihRKQ.js';

const Error = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="bg-no-repeat bg-center bg-cover min-h-screen flex flex-col" style="${"background-image: url(" + escape(backgroundImage, true) + ")"}">${validate_component(Navbar, "Navbar").$$render($$result, {}, {}, {})} <div class="flex-grow flex items-center justify-center" data-svelte-h="svelte-538nxj"><div class="bg-white bg-opacity-90 p-6 sm:p-8 rounded-md shadow-md text-center"><h2 class="text-4xl sm:text-5xl font-bold mb-4 text-custom-color-secondary">Error</h2> <p class="text-xl sm:text-2xl text-gray-600">Page Not Found</p> <a href="/" class="inline-block mt-6 bg-custom-btn-bg text-custom-btn-text px-6 py-3 text-base rounded-md hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg">Go to Home</a></div></div></div>`;
});
const Error_1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Error, "Error").$$render($$result, {}, {}, {})}`;
});

export { Error_1 as default };
//# sourceMappingURL=_error.svelte-vIbMQJHX.js.map
