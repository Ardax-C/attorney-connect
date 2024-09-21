const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["200.html","logo-icon.png"]),
	mimeTypes: {".html":"text/html",".png":"image/png"},
	_: {
		client: {"start":"_app/immutable/entry/start.CiriLLde.js","app":"_app/immutable/entry/app.BpsTYulu.js","imports":["_app/immutable/entry/start.CiriLLde.js","_app/immutable/chunks/entry.DL6fMepx.js","_app/immutable/chunks/scheduler.BdtpZxVt.js","_app/immutable/entry/app.BpsTYulu.js","_app/immutable/chunks/scheduler.BdtpZxVt.js","_app/immutable/chunks/index.C7Q59YAp.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./chunks/0-DWkWL_3W.js')),
			__memo(() => import('./chunks/1-BUD4X3_V.js')),
			__memo(() => import('./chunks/2-B1cziTKu.js')),
			__memo(() => import('./chunks/3-BzpcT5o5.js')),
			__memo(() => import('./chunks/4-H4AjjA6y.js')),
			__memo(() => import('./chunks/5-DzatBXHN.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/profile",
				pattern: /^\/profile\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/signup",
				pattern: /^\/signup\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
