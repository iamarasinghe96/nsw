/* liquid-glass-filter.js
 * Injects a hidden SVG with an SVG displacement-map filter that creates
 * an optical lens refraction effect when referenced via backdrop-filter.
 * Usage: backdrop-filter: url(#liquidGlass) blur(Xpx) brightness(Y)
 */
(function () {
  var LENS = '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';

  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<defs>' +
      '<filter id="liquidGlass" x="-12%" y="-12%" width="124%" height="124%"' +
      ' color-interpolation-filters="sRGB">' +
        '<feImage href="data:image/png;base64,' + LENS + '"' +
        ' result="lens" preserveAspectRatio="none" />' +
        '<feDisplacementMap in="SourceGraphic" in2="lens"' +
        ' scale="35" xChannelSelector="R" yChannelSelector="G" />' +
      '</filter>' +
    '</defs>';

  // Inject as first child of body so filter is available immediately
  if (document.body) {
    document.body.insertBefore(svg, document.body.firstChild);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.insertBefore(svg, document.body.firstChild);
    });
  }
})();
