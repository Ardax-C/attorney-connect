import { c as create_ssr_component, v as validate_component, k as escape, l as add_attribute } from './ssr-n0ns-7Y6.js';
import { N as Navbar, b as backgroundImage } from './pexels-lastly-2086917-BsjB_5eG.js';
import 'firebase/auth';
import './client-Ce2ihRKQ.js';
import 'firebase/firestore';
import './paths-CYDIOyak.js';
import 'firebase/app';
import 'firebase/storage';
import 'firebase/analytics';

const Login = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let emailOrUsername = "";
  let password = "";
  return `<div class="bg-no-repeat bg-center bg-cover min-h-screen" style="${"background-image: url(" + escape(backgroundImage, true) + ")"}">${validate_component(Navbar, "Navbar").$$render($$result, {}, {}, {})} <div class="flex items-center justify-center py-8 px-4"><div class="bg-zinc-800 bg-opacity-90 p-6 sm:p-8 rounded-md shadow-md w-full max-w-md"><h2 class="text-2xl sm:text-3xl font-bold mb-6 text-center text-custom-color-secondary" data-svelte-h="svelte-1528tkk">Login to your account:</h2> <form><div class="mb-4"><input type="text" placeholder="Email or Username" class="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required${add_attribute("value", emailOrUsername, 0)}></div> <div class="mb-6"><input type="password" placeholder="Password" class="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required${add_attribute("value", password, 0)}></div> ${``} <div class="flex flex-col sm:flex-row items-center justify-between"><button type="submit" class="bg-custom-btn-bg text-custom-btn-text px-6 py-3 text-base rounded-md hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg mb-4 sm:mb-0 w-full sm:w-auto" data-svelte-h="svelte-g84ond">Login</button> <button type="button" class="text-custom-color-secondary text-base hover:underline bg-transparent border-none p-0" data-svelte-h="svelte-f2mknk">Forgot Password?</button></div></form></div></div></div> ${``}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Login, "Login").$$render($$result, {}, {}, {})}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-DRoMdANt.js.map
