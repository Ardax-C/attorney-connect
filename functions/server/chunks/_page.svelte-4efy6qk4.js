import { c as create_ssr_component, v as validate_component, k as escape, l as add_attribute, o as each } from './ssr-n0ns-7Y6.js';
import { N as Navbar, b as backgroundImage } from './pexels-lastly-2086917-BsjB_5eG.js';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/storage';
import './paths-CYDIOyak.js';
import 'firebase/app';
import 'firebase/analytics';
import './client-Ce2ihRKQ.js';

const Signup = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let firstName = "";
  let lastName = "";
  let email = "";
  let phone = "";
  let username = "";
  let password = "";
  let website = "";
  let city = "";
  let practiceAreas = [""];
  const states = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming"
  ];
  return `<div class="bg-no-repeat bg-center bg-cover min-h-screen pb-8 sm:pb-0" style="${"background-image: url(" + escape(backgroundImage, true) + ")"}">${validate_component(Navbar, "Navbar").$$render($$result, {}, {}, {})} <div class="max-w-5xl mx-auto my-6 p-4 sm:p-6 rounded-sm shadow-md bg-zinc-800 bg-opacity-90"><h2 class="text-2xl font-bold mb-4 text-center text-custom-color-tertiary font-inter" data-svelte-h="svelte-12hpbb3">Sign Up for Access!</h2> <p class="text-center text-emerald-400 mb-6 text-base sm:text-lg" data-svelte-h="svelte-6f0jwa">Once registered, you will have access to view the Attorney Directory!</p> <form class="grid grid-cols-1 sm:grid-cols-3 gap-4"><div class="sm:col-span-1"><div class="mb-4"><label for="firstName" class="block text-emerald-400 text-base mb-1" data-svelte-h="svelte-1e05p91">First Name *</label> <input type="text" id="firstName" class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required${add_attribute("value", firstName, 0)}></div> <div class="mb-4"><label for="lastName" class="block text-emerald-400 text-base mb-1" data-svelte-h="svelte-paw3gl">Last Name *</label> <input type="text" id="lastName" class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required${add_attribute("value", lastName, 0)}></div> <div class="mb-4"><label for="email" class="block text-emerald-400 text-base mb-1" data-svelte-h="svelte-1hvv1bh">Email *</label> <input type="email" id="email" class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required${add_attribute("value", email, 0)}></div></div> <div class="sm:col-span-1"><div class="mb-4"><label for="phone" class="block text-emerald-400 text-base mb-1" data-svelte-h="svelte-jgql8">Phone/Mobile *</label> <input type="tel" id="phone" class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required${add_attribute("value", phone, 0)}></div> <div class="mb-4"><label for="username" class="block text-emerald-400 text-base mb-1" data-svelte-h="svelte-15z0iqn">Username *</label> <input type="text" id="username" class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required${add_attribute("value", username, 0)}></div> <div class="mb-4"><label for="password" class="block text-emerald-400 text-base mb-1" data-svelte-h="svelte-1ycbw87">Password *</label> <input type="password" id="password" class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary" required${add_attribute("value", password, 0)}></div></div> <div class="sm:col-span-1"><div class="mb-4"><label for="website" class="block text-emerald-400 text-base mb-1" data-svelte-h="svelte-1x6lg4l">Website</label> <input type="url" id="website" class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary"${add_attribute("value", website, 0)}></div> <div class="mb-4"><label for="city" class="block text-emerald-400 text-base mb-1" data-svelte-h="svelte-1fnm725">City</label> <input type="text" id="city" class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary"${add_attribute("value", city, 0)}></div> <div class="mb-4"><label for="state" class="block text-emerald-400 text-base mb-1" data-svelte-h="svelte-poir4t">State</label> <select id="state" class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary"><option value="" data-svelte-h="svelte-1e6exvk">- Select -</option>${each(states, (state) => {
    return `<option${add_attribute("value", state, 0)}>${escape(state)}</option>`;
  })}</select></div></div> <div class="sm:col-span-3"><div class="mb-4"><label for="practiceAreas" class="block text-emerald-400 text-base mb-1" data-svelte-h="svelte-v61bqp">Practice Areas</label> ${each(practiceAreas, (practiceArea, index) => {
    return `<div class="flex items-center mb-2"><input type="text" id="practiceAreas" class="w-full px-4 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-custom-color-primary"${add_attribute("value", practiceAreas[index], 0)}> ${index === practiceAreas.length - 1 ? `<button type="button" class="ml-2 bg-custom-btn-bg text-custom-btn-text px-4 py-2 text-base rounded hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg" data-svelte-h="svelte-4j10o3"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"></path></svg> </button>` : ``} </div>`;
  })}</div> <div class="mb-4"><label for="profilePicture" class="block text-emerald-400 text-base mb-2" data-svelte-h="svelte-z25oq8">Profile Picture</label> <input type="file" id="profilePicture" accept="image/*" class="hidden"> <label for="profilePicture" class="bg-custom-btn-bg text-custom-btn-text px-4 py-2 text-base rounded cursor-pointer hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg">${escape("Choose File")}</label> ${``}</div> ${``} <div class="text-center" data-svelte-h="svelte-l089ag"><button type="submit" class="bg-custom-btn-bg text-custom-btn-text px-6 py-3 text-base rounded hover:bg-custom-btn-hover-bg hover:text-custom-btn-hover-text focus:outline-none focus:ring-2 focus:ring-custom-btn-active-bg font-bold">Submit Form</button></div> ${``}</div></form></div></div>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Signup, "Signup").$$render($$result, {}, {}, {})}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-4efy6qk4.js.map
