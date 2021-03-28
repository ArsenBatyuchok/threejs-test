import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import imagesLoaded from 'imagesloaded';
import gsap from 'gsap';

import fragment from './shaders/fragment.glsl';
import vertex from './shaders/vertex.glsl';
import Scroll from './scroll';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

export default class Sketch {
  constructor(options) {
    this.time = 0;
    this.container = options.dom;
    this.scene = new THREE.Scene();

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 100, 2000 );
    this.camera.position.z = 600;

    this.camera.fov = 2*Math.atan((this.height/2)/600) * (180/Math.PI);

    this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );

    this.container.appendChild( this.renderer.domElement );

    this.controls = new OrbitControls( this.camera, this.renderer.domElement );

    this.images = [...document.querySelectorAll('img')];

    const preloadImages = new Promise((res) => {
      imagesLoaded(document.querySelectorAll('img'), { background: true }, res);
    });

    this.currentScroll = 0;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    Promise.all([preloadImages]).then(() => {
      this.scroll = new Scroll();
      this.addImages();
      this.setPosition();

      this.mouseMovement();
      this.resize();
      this.setupResize();
      this.composerPass();
      this.render();
    });
  }

  mouseMovement() {
    window.addEventListener('mousemove', event => {
      this.mouse.x = ( event.clientX / this.width ) * 2 - 1;
      this.mouse.y = - ( event.clientY / this.height ) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersects = this.raycaster.intersectObjects(this.scene.children);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        obj.material.uniforms.hover.value = intersects[0].uv;
      }
    }, false);
  }

  setupResize() {
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer.setSize( this.width, this.height );
    this.camera.aspect = this.width/this.height;
    this.camera.updateProjectionMatrix();
  }

  addObjects() {
    this.geometry = new THREE.PlaneBufferGeometry(100, 100, 10, 10);
    this.material = new THREE.MeshNormalMaterial();



    this.mesh = new THREE.Mesh( this.geometry, this.material );
    this.scene.add( this.mesh );
  }

  composerPass() {
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.myEffect = {
      uniforms: {
        "tDiffuse": { value: null },
        "scrollSpeed": { value: null }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float scrollSpeed;
        varying vec2 vUv;
        
        void main() {
          vec2 newUV = vUv;
          float area = smoothstep(0.4, 0., vUv.y);
          newUV.x -= (vUv.x - 0.5) * 0.2 * area * scrollSpeed;
          gl_FragColor = texture2D(tDiffuse, newUV);
          // gl_FragColor = vec4(area, 0., 0., 1.);
        }
      `
    };

    this.customPass = new ShaderPass(this.myEffect);
    this.customPass.renderToScreen = true;

    this.composer.addPass(this.customPass);
  }

  addImages() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        uImage: { value: 0 },
        hover: { value: new THREE.Vector2(0.5, 0.5)},
        hoverState: { value: 0 }
      },
      side: THREE.DoubleSide,
      fragmentShader: fragment,
      vertexShader: vertex
      // wireframe: true
    });
    this.materials = [];
    this.imageStore = this.images.map(img => {
      let bounds = img.getBoundingClientRect();
      let geometry = new THREE.PlaneBufferGeometry(bounds.width, bounds.height, 10, 10);
      let texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      let material = this.material.clone();

      this.materials.push(material);
      material.uniforms.uImage.value = texture;

      let mesh = new THREE.Mesh(geometry, material);

      this.scene.add(mesh);

      img.addEventListener('mouseenter', () => {
        gsap.to(material.uniforms.hoverState, {
          duration: 1,
          value: 1
        });
      });

      img.addEventListener('mouseout', () => {
        gsap.to(material.uniforms.hoverState, {
          duration: 1,
          value: 0
        });
      });

      return {
        img: img,
        mesh: mesh,
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height
      };
    });
  }

  setPosition() {
    this.imageStore.forEach(o => {
      o.mesh.position.y = this.currentScroll - o.top + this.height/2 - o.height/2;
      o.mesh.position.x = o.left - this.width/2 + o.width/2;
    });
  }

  render = () => {
    this.time += 0.05;
    this.scroll.render();
    this.currentScroll = this.scroll.scrollToRender;
    this.setPosition();

    this.customPass.uniforms.scrollSpeed.value = this.scroll.speedTarget;

    this.materials.forEach(m => {
      m.uniforms.time.value = this.time;
    });

    // this.renderer.render( this.scene, this.camera );
    this.composer.render();

    window.requestAnimationFrame(this.render);
  }
}

new Sketch({
  dom: document.getElementById('container')
});
