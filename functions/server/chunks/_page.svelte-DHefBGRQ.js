import { c as create_ssr_component, v as validate_component, k as escape } from './ssr-n0ns-7Y6.js';
import { N as Navbar, b as backgroundImage } from './pexels-lastly-2086917-BsjB_5eG.js';
import 'firebase/auth';
import 'firebase/firestore';
import './client-Ce2ihRKQ.js';
import './paths-CYDIOyak.js';
import 'firebase/app';
import 'firebase/storage';
import 'firebase/analytics';

const Main = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="bg-no-repeat bg-center bg-cover min-h-screen" style="${"background-image: url(" + escape(backgroundImage, true) + ")"}">${validate_component(Navbar, "Navbar").$$render($$result, {}, {}, {})} <div class="container mx-auto px-4 py-8"><div class="max-w-lg mx-auto my-16 text-center"><p class="font-inter text-custom-color-primary text-3xl sm:text-4xl mb-2" data-svelte-h="svelte-19funxu">ATTORNEY NETWORK</p> <p class="font-inter text-custom-color-primary text-5xl sm:text-6xl md:text-7xl" data-svelte-h="svelte-3yls80"><span class="text-custom-color-tertiary">Trusted</span> Attorneys</p> <p class="text-custom-color-primary text-lg sm:text-xl mt-6 mb-8" data-svelte-h="svelte-dxv4dj">As a legal professional, your <span class="text-custom-color-primary">success is our top priority</span>. We&#39;re dedicated to providing the expertise and support you need to excel.</p> <button class="bg-custom-btn-bg text-custom-btn-text font-inter py-3 px-6 rounded-sm border-none text-xl sm:text-2xl w-full sm:w-auto cursor-pointer transition duration-300 ease-in-out transform hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text active:scale-95">${escape("Get Started")}</button></div></div></div>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Main, "Main").$$render($$result, { class: "p-0" }, {}, {})}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-DHefBGRQ.js.map
