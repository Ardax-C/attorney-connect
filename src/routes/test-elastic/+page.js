export const prerender = false;
export const ssr = true;

export async function load() {
  return {
    status: 'loading'
  };
} 