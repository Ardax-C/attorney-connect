import { c as create_ssr_component, l as add_attribute, k as escape } from './ssr-n0ns-7Y6.js';
import { b as base } from './paths-CYDIOyak.js';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import './client-Ce2ihRKQ.js';

const brandLogo = "data:image/png;base64,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";
const firebaseConfig = {
  apiKey: void 0,
  authDomain: void 0,
  projectId: void 0,
  storageBucket: void 0,
  messagingSenderId: void 0,
  appId: void 0,
  measurementId: void 0
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
getStorage(app);
getAnalytics(app);
const Navbar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<nav class="w-full flex items-center justify-between flex-wrap bg-zinc-900 p-3"><div class="flex items-center flex-shrink-0 text-white mr-6"><a${add_attribute("href", `${base}/`, 0)}><img${add_attribute("src", brandLogo, 0)} alt="" class="filter-brand-logo-1 h-12 w-auto"></a></div> <div class="block lg:hidden"><button class="flex items-center px-3 py-2 border rounded text-custom-color-secondary border-custom-color-secondary hover:text-white hover:border-white" data-svelte-h="svelte-1wj6g7t"><svg class="fill-current h-3 w-3" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><title>Menu</title><path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"></path></svg></button></div> <div class="${"w-full block lg:flex lg:items-center lg:w-auto " + escape("hidden", true)}" id="nav-content"><ul class="text-sm lg:flex-grow lg:flex lg:justify-end">${`<li data-svelte-h="svelte-14kgq1k"><a href="/login" class="block mt-4 lg:inline-block lg:mt-0 text-white hover:text-orange-400 mr-4 text-lg">Login</a></li> <li data-svelte-h="svelte-e8xwuo"><a href="/signup" class="block mt-4 lg:inline-block lg:mt-0 text-white hover:text-orange-400 mr-4 text-lg">Sign Up</a></li>`}</ul></div></nav>`;
});
const backgroundImage = "/_app/immutable/assets/pexels-lastly-2086917.MbGsuH_8.jpg";

export { Navbar as N, auth as a, backgroundImage as b, db as d };
//# sourceMappingURL=pexels-lastly-2086917-BsjB_5eG.js.map
