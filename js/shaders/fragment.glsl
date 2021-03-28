varying float vNoise;
varying vec2 vUv;
uniform sampler2D uImage;
uniform float time;

void main() {
  vec2 newUv = vUv;

//  newUv = vec2(newUv.x, newUv.y  + 0.01*sin(newUv.x*10. + time));

  vec4 imgView = texture2D(uImage, newUv);

  gl_FragColor = vec4(vUv, 0., 1.);
  gl_FragColor = imgView;
  gl_FragColor.rgb += 0.02*vec3(vNoise);
}
