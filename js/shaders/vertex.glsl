uniform float time;
uniform vec2 hover;
uniform float hoverState;
varying float vNoise;
varying vec2 vUv;

void main() {
  vec3 newposition = position;
  float PI = 3.1415925;

//  float noise = cnoise(3.*vec3(position.x, position.y, position.z - time/30.));

  float dist = distance(uv, hover);

  newposition.z += hoverState*10.*sin(dist*10. + time);

  vNoise = sin(dist*10.-time);
  vUv = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newposition, 1.0);
}
