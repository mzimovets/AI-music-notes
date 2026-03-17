if (!self.define) {
  let e,
    s = {};
  const a = (a, c) => (
    (a = new URL(a + ".js", c).href),
    s[a] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          (e.src = a), (e.onload = s), document.head.appendChild(e);
        } else (e = a), importScripts(a), s();
      }).then(() => {
        let e = s[a];
        if (!e) throw new Error(`Module ${a} didn’t register its module`);
        return e;
      })
  );
  self.define = (c, i) => {
    const t =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[t]) return;
    let n = {};
    const r = (e) => a(e, t),
      d = { module: { uri: t }, exports: n, require: r };
    s[t] = Promise.all(c.map((e) => d[e] || r(e))).then((e) => (i(...e), n));
  };
}
define(["./workbox-6b22235a"], function (e) {
  "use strict";
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: "/192.jpg", revision: "3128ae8f5984e72dcb62d45626910736" },
        { url: "/512.png", revision: "f2a316aa51803a706326eb3bcc4703be" },
        {
          url: "/ProgramCover.png",
          revision: "1ed97c50dcec88d90d6179c85937d4d7",
        },
        {
          url: "/_next/app-build-manifest.json",
          revision: "8f723f29477d1094a5af18f92ef9047c",
        },
        {
          url: "/_next/static/_EXBLu15D32bt1UtWX3eA/_buildManifest.js",
          revision: "da8d65641510592d98f1b810bc18c15c",
        },
        {
          url: "/_next/static/_EXBLu15D32bt1UtWX3eA/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/1684-66a45766955c67be.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/1833-c65f14f15540561c.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/1909.9eeb430ed8c69914.js",
          revision: "9eeb430ed8c69914",
        },
        {
          url: "/_next/static/chunks/1970-2f5497e1b3343221.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/2108-3675803e3717be40.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/24c9ba2e.ca3d850a8fea1c59.js",
          revision: "ca3d850a8fea1c59",
        },
        {
          url: "/_next/static/chunks/2500-9c44c05f95a6d37a.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/2700-b8e162822c7bdfbd.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/2816-d9f304eb2f4ac387.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/3088-09faa6ec5f9e5c21.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/339-a769d18df4534053.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/4632-4ed66225b8fa614c.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/4983-d208cf443a9c744d.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/4bd1b696-982676f09dfe27f4.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/6247-7453d8a6391ec7a1.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/6370.2812fcaa5dd652b9.js",
          revision: "2812fcaa5dd652b9",
        },
        {
          url: "/_next/static/chunks/6464-d2169e5743145943.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/6545-0b36a9ba781a81d5.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/6974.64ccdf21f58e20f4.js",
          revision: "64ccdf21f58e20f4",
        },
        {
          url: "/_next/static/chunks/7385-d9bb89ca74780091.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/7386-1086dca81c7537b9.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/8062-2b21b2f62e3004d4.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/8111-859478f6e7b90717.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/8135-7571fe68e41d6ec7.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/8462-3b33b5214d332411.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/9288-419c72a3b63b3382.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/9641.55796bcb730cb70a.js",
          revision: "55796bcb730cb70a",
        },
        {
          url: "/_next/static/chunks/9b0008ae.e69303699af3b3d4.js",
          revision: "e69303699af3b3d4",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-f54c338c30d1b456.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/about/layout-5a34a7f9a7ce047d.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/about/page-427771d5bc13903b.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/api/auth/%5B...nextauth%5D/route-dac9f8f81e774b26.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/authPage/layout-9b0a905895c04a75.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/authPage/page-0833c6d6e8fd57fa.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/docs/layout-f4525f830514061c.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/docs/page-eb022e867293551e.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/error-49e460c9bb115370.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/layout-36454ffa33b3ea04.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/page-de6cbc34d72103c0.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/playlist/%5Bcategory%5D/layout-c4ae9f8d99bb922d.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/playlist/%5Bcategory%5D/page-dae8d78b6b257b6a.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/song/%5Bid%5D/layout-36d2a890d6d74b85.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/song/%5Bid%5D/page-a20095f1f91ec21e.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/songRead/%5Bid%5D/layout-01c958ef0b014e06.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/songRead/%5Bid%5D/page-69cb5b0e5218aeb9.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/stack/%5Bid%5D/layout-7686884e10649531.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/stack/%5Bid%5D/page-a2c342433e7781ac.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/stackView/%5Bid%5D/layout-574a67f83a7743cb.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/app/stackView/%5Bid%5D/page-321e4202fb4a43dc.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/framework-2c2be674e67eda3d.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/main-649080635b01459e.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/main-app-f223d335fbc30c7f.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/pages/_app-5d1abe03d322390c.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/pages/_error-3b2a1d523de49635.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-87f2331fa08a4bbf.js",
          revision: "_EXBLu15D32bt1UtWX3eA",
        },
        {
          url: "/_next/static/css/0e7f090af69e5839.css",
          revision: "0e7f090af69e5839",
        },
        {
          url: "/_next/static/css/827658ac991ae42e.css",
          revision: "827658ac991ae42e",
        },
        {
          url: "/_next/static/css/a0dcc4e299b1da16.css",
          revision: "a0dcc4e299b1da16",
        },
        {
          url: "/_next/static/css/e06cbe7480d02c13.css",
          revision: "e06cbe7480d02c13",
        },
        {
          url: "/_next/static/media/046b90749014f852-s.woff2",
          revision: "19bf2a23f7f672153135a9d1918f6f9a",
        },
        {
          url: "/_next/static/media/19cfc7226ec3afaa-s.woff2",
          revision: "9dda5cfc9a46f256d0e131bb535e46f8",
        },
        {
          url: "/_next/static/media/21350d82a1f187e9-s.woff2",
          revision: "4e2553027f1d60eff32898367dd4d541",
        },
        {
          url: "/_next/static/media/3703c28dcda155b1-s.p.woff2",
          revision: "913e693f5c2ab3326efdef602387df9d",
        },
        {
          url: "/_next/static/media/67110d8fe39c5e84-s.woff2",
          revision: "91c073ec3046c2fc252900a89b6fc5d0",
        },
        {
          url: "/_next/static/media/6aacc40b7795b725-s.woff2",
          revision: "48e07fe2ca9c3bc32d09affb2ace8844",
        },
        {
          url: "/_next/static/media/8e9860b6e62d6359-s.woff2",
          revision: "01ba6c2a184b8cba08b0d57167664d75",
        },
        {
          url: "/_next/static/media/999e639cd9d85971-s.woff2",
          revision: "59533f46ae2b6e4fed5c133c03ea0608",
        },
        {
          url: "/_next/static/media/9af6411484c7e20a-s.woff2",
          revision: "5b05a416e63edb75425ca60ded1ac018",
        },
        {
          url: "/_next/static/media/ba9851c3c22cd980-s.woff2",
          revision: "9e494903d6b0ffec1a1e14d34427d44d",
        },
        {
          url: "/_next/static/media/c5fe6dc8356a8c31-s.woff2",
          revision: "027a89e9ab733a145db70f09b8a18b42",
        },
        {
          url: "/_next/static/media/df0a9ae256c0569c-s.woff2",
          revision: "d54db44de5ccb18886ece2fda72bdfe0",
        },
        {
          url: "/_next/static/media/e4af272ccee01ff0-s.p.woff2",
          revision: "65850a373e258f1c897a2b3d75eb74de",
        },
        {
          url: "/_next/static/media/e6b5cfd5a74e1cae-s.woff2",
          revision: "8358e3d9b140dd03a59878681e98a5e4",
        },
        {
          url: "/_next/static/media/pdf.worker.min.8221b564.mjs",
          revision: "8221b564",
        },
        {
          url: "/apple-touch-icon-precomposed.png",
          revision: "f2a316aa51803a706326eb3bcc4703be",
        },
        {
          url: "/apple-touch-icon.png",
          revision: "f2a316aa51803a706326eb3bcc4703be",
        },
        { url: "/cover.png", revision: "6a87fa3676f3d91a53cfde271baeaa58" },
        { url: "/favicon.ico", revision: "34fb555aca7ccbaafcbd0669b04be0d5" },
        { url: "/favicon.svg", revision: "07cf3c14fc4e2372e68d2babebc7c4ca" },
        {
          url: "/fonts/RobotoSlab-VariableFont_wght.ttf",
          revision: "ae0ebe61db8f1753236da81092bd5876",
        },
        {
          url: "/icons/camerton.svg",
          revision: "e005cac3658caba50ce3fcb1152115e2",
        },
        { url: "/logo192.png", revision: "f2a316aa51803a706326eb3bcc4703be" },
        { url: "/logo512.png", revision: "5c8d136ee08ed88fdc909341e253e46b" },
        { url: "/manifest.json", revision: "a922c118f0ff2290817e650b91eaaf06" },
        {
          url: "/meals-pdf/blagoveshchenie-kond.pdf",
          revision: "ff40c870f54570af75097994dff68bf2",
        },
        {
          url: "/meals-pdf/blagoveshchenie-trop.pdf",
          revision: "32ae617d3153826f0ec70e2279aad354",
        },
        {
          url: "/meals-pdf/daily-per.pdf",
          revision: "3e895dbc751aeac3e9f33d5af64b9d6c",
        },
        {
          url: "/meals-pdf/daily-pos.pdf",
          revision: "804e21b82a486e5dbb726ff3a272a912",
        },
        {
          url: "/meals-pdf/kreshchenie-kond.pdf",
          revision: "9fd5566b962a76cba0e65d61e4304cc0",
        },
        {
          url: "/meals-pdf/kreshchenie-trop.pdf",
          revision: "2a9a730d5133c8cda36c5dee878b7145",
        },
        {
          url: "/meals-pdf/pascha-kond.pdf",
          revision: "ef000e078e1171a6d1885e2d2811d5ce",
        },
        {
          url: "/meals-pdf/pascha-trop.pdf",
          revision: "776a4dfde0d3c26e508cf025f3fa0be5",
        },
        {
          url: "/meals-pdf/preobrazhenie-kond.pdf",
          revision: "41fbe362c49312716adc6acc2579107f",
        },
        {
          url: "/meals-pdf/preobrazhenie-trop.pdf",
          revision: "ed34b952ae3851496450bd45fe59c8ec",
        },
        {
          url: "/meals-pdf/rozhdestvo-kond.pdf",
          revision: "0d8fc0ec3a8bb80d9e71c08adbf2101b",
        },
        {
          url: "/meals-pdf/rozhdestvo-trop.pdf",
          revision: "925a583f0b65f3be246b63883f83e27d",
        },
        {
          url: "/meals-pdf/rozhdestvoBogorodicy-kond.pdf",
          revision: "2e41d6a446539eb78c23cfa4fa5a1874",
        },
        {
          url: "/meals-pdf/rozhdestvoBogorodicy-trop.pdf",
          revision: "570ca4cfb4d0b42e0a06fd567917d948",
        },
        {
          url: "/meals-pdf/sretenie-kond.pdf",
          revision: "19cb973974053b91b2188558bc01831d",
        },
        {
          url: "/meals-pdf/sretenie-trop.pdf",
          revision: "39eeb61df87ddf116a4ec5cf4535b2d0",
        },
        {
          url: "/meals-pdf/troica-kond.pdf",
          revision: "8fc629489fb1814be559023feb6c7a8a",
        },
        {
          url: "/meals-pdf/troica-trop.pdf",
          revision: "ed35c4d2cfda4de64686ef050dd76bfd",
        },
        {
          url: "/meals-pdf/uspenie-kond.pdf",
          revision: "3ae668d48ef8e9a49525e9fd1c986454",
        },
        {
          url: "/meals-pdf/uspenie-trop.pdf",
          revision: "0c4c09d5c4af236cdfaf3fd2e07ef515",
        },
        {
          url: "/meals-pdf/vhod-kond.pdf",
          revision: "281bc5e16223e462dac48e3067cb8faa",
        },
        {
          url: "/meals-pdf/vhod-trop.pdf",
          revision: "58486106c47c236e0c10814ea8857692",
        },
        {
          url: "/meals-pdf/vozdvizhenie-kond.pdf",
          revision: "e4373bd04abc0c7ad18d9320c99bab6e",
        },
        {
          url: "/meals-pdf/vozdvizhenie-trop.pdf",
          revision: "0b8bc4b7b7ff7aa3ee029fee150b3927",
        },
        {
          url: "/meals-pdf/voznesenie-kond.pdf",
          revision: "08b039b36082021b9a788d29623d23f9",
        },
        {
          url: "/meals-pdf/voznesenie-trop.pdf",
          revision: "1a1e01f36cb84a51a3eeb134ebb20230",
        },
        {
          url: "/meals-pdf/vvedenie-kond.pdf",
          revision: "0c9d2c93e736594a3ef24acb7c143c1f",
        },
        {
          url: "/meals-pdf/vvedenie-trop.pdf",
          revision: "cf8cc6f0f0d57b3c4543f6bb6e27c546",
        },
        { url: "/next.svg", revision: "8e061864f388b47f33a1c3780831193e" },
        {
          url: "/songs/carols.jpg",
          revision: "7a580afa0d05af8f6f67febcbe8141b3",
        },
        {
          url: "/songs/children.jpg",
          revision: "068ae4bdf86bdd506eb4eab237dc8ba0",
        },
        {
          url: "/songs/kants.jpg",
          revision: "21bc5d854b31e85e163758d2c7c96f31",
        },
        {
          url: "/songs/narod.jpg",
          revision: "304e75b106a185bddafb02c93bf0922d",
        },
        {
          url: "/songs/other.jpg",
          revision: "b4178cb0492206f8b55d4c64499aea80",
        },
        {
          url: "/songs/pasha.jpg",
          revision: "edd84781bdb0c09f1eece0e283bb63d9",
        },
        {
          url: "/songs/pobeda.jpg",
          revision: "eebdb4d4861f89291504babdf505a9ed",
        },
        {
          url: "/songs/soviet.jpg",
          revision: "50c45b3d30967cbc113d8d89513b26d7",
        },
        {
          url: "/stacks/cover/blue.png",
          revision: "3a669246b572128daa6758f74f45346f",
        },
        {
          url: "/stacks/cover/brown.png",
          revision: "3029f7a28ef12d63f881978e901e5980",
        },
        {
          url: "/stacks/cover/dark-purple.png",
          revision: "90c6416c70f8dbdfd282cc73fe72679f",
        },
        {
          url: "/stacks/cover/green.png",
          revision: "6bc31ef3c3e1b2aa8618d488f3e356a6",
        },
        {
          url: "/stacks/cover/grey.png",
          revision: "0e8ed0c8ea125ff6b637d44d01c21e31",
        },
        {
          url: "/stacks/cover/ocean.png",
          revision: "db1ad95aca251c97cec8cb480a14806b",
        },
        {
          url: "/stacks/cover/orange.png",
          revision: "3389439d09ddcc888e57437c31b16121",
        },
        {
          url: "/stacks/cover/purple.png",
          revision: "a9facf9323033a02a9f97847973b4682",
        },
        {
          url: "/stacks/cover/red.png",
          revision: "4e1461539c6538341d140c9bd532dfe7",
        },
        {
          url: "/stacks/cover/salat.png",
          revision: "da7d69a7d3c778121f3089bc971a4a86",
        },
        {
          url: "/stacks/cover/white.png",
          revision: "ad4e0b97079559ed6367bf5a64efe0b5",
        },
        {
          url: "/stacks/cover/yellow.png",
          revision: "b432f8ac6e6ad6fd5aac433fef087b71",
        },
        {
          url: "/stacks/preview/blue.png",
          revision: "ae3ad4e4d94c309300536adf19a84fe5",
        },
        {
          url: "/stacks/preview/brown.png",
          revision: "787b51283e3fac92006d002ad4849eda",
        },
        {
          url: "/stacks/preview/dark-purple.png",
          revision: "38d5f6595f1d95a92e9056dcc3bbdab1",
        },
        {
          url: "/stacks/preview/green.png",
          revision: "73e47279e134d3eb191e280651013d3b",
        },
        {
          url: "/stacks/preview/grey.png",
          revision: "21d5fc486f8dbefaf9d3b1d39461a886",
        },
        {
          url: "/stacks/preview/ocean.png",
          revision: "af6415b54c225bfce1d44b863607609a",
        },
        {
          url: "/stacks/preview/orange.png",
          revision: "de111ee9251c16ed5c4a5c4b441d2579",
        },
        {
          url: "/stacks/preview/purple.png",
          revision: "3d778b1b02a679a289321f45b39137f5",
        },
        {
          url: "/stacks/preview/red.png",
          revision: "8cad3931a34ea9e0d416b734db94f314",
        },
        {
          url: "/stacks/preview/salat.png",
          revision: "4b10691db2b33aca23eecb53302c8a16",
        },
        {
          url: "/stacks/preview/white.png",
          revision: "52e208ee5a8def8ab689baaeb1e24dc7",
        },
        {
          url: "/stacks/preview/yellow.png",
          revision: "e60dce1b704470d4c1db9e3abfbbc9b3",
        },
        { url: "/vercel.svg", revision: "61c6b19abff40ea7acd577be818f3976" },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: a,
              state: c,
            }) =>
              s && "opaqueredirect" === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: "OK",
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^\/_next\/static\/.*/,
      new e.CacheFirst({
        cacheName: "_next-static",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^\/uploads\/.*/,
      new e.CacheFirst({
        cacheName: "uploads-cache",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 2592e3 }),
          new e.CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^\/.*$/,
      new e.NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 604800 }),
          new e.CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
      "GET",
    );
});
