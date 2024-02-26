import * as THREE from "https://unpkg.com/three@0.126.1/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import gsap from "gsap";

const DEFAULT_WIDTH = 50;
const DEFAULT_HEIGHT = 50;
const DEFAULT_WIDTH_SEGMENTS = 40;
const DEFAULT_HEIGHT_SEGMENTS = 40;
const FRAME_STEP = 0.02;
const FRAME_COS_COEFFICIENT = 0.3;
const RGB_COLOR_COUNT = 3;

const gui = new dat.GUI();
const world = {
  plane: {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    widthSegments: DEFAULT_WIDTH_SEGMENTS,
    heightSegments: DEFAULT_HEIGHT_SEGMENTS,
  },
};
gui.add(world.plane, "width", 1, 100).onChange(generatePlane);
gui.add(world.plane, "height", 1, 100).onChange(generatePlane);
gui.add(world.plane, "widthSegments", 1, 50).onChange(generatePlane);
gui.add(world.plane, "heightSegments", 1, 50).onChange(generatePlane);

////////////////////////////////////

// raycaster = "lazer" which shows us if we are toching the geometry
const raycaster = new THREE.Raycaster();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);

document.body.appendChild(renderer.domElement);
camera.position.z = 20;

new OrbitControls(camera, renderer.domElement);

const planeGeometry = new THREE.PlaneGeometry(
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH_SEGMENTS,
  DEFAULT_HEIGHT_SEGMENTS
);
const planeMaterial = new THREE.MeshPhongMaterial({
  //   color: 0xff0000,
  side: THREE.DoubleSide,
  flatShading: THREE.FlatShading,
  // if vertexColors set to true, color should be removed
  vertexColors: true,
});
const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(planeMesh);

const planeGeometryArray = planeMesh.geometry.attributes.position.array;
const randomValues = [];
for (let i = 0; i < planeGeometryArray.length; i++) {
  if (i % 3 === 0) {
    const x = planeGeometryArray[i];
    const y = planeGeometryArray[i + 1];
    const z = planeGeometryArray[i + 2];

    planeGeometryArray[i] = x + (Math.random() - 0.5);
    planeGeometryArray[i + 1] = y + (Math.random() - 0.5);
    planeGeometryArray[i + 2] = z + Math.random();
  }

  randomValues.push(Math.random() - 0.5);
}

planeMesh.geometry.attributes.position.randomValues = [...randomValues];

// custom field originalPosition
planeMesh.geometry.attributes.position.originalPosition = [
  ...planeMesh.geometry.attributes.position.array,
];

const colors = [];
for (let i = 0; i < planeMesh.geometry.attributes.position.count; i++) {
    // deep blue
  colors.push(0, 0.19, 0.4);
}

// r + g + b = 3 (count)
// initially mesh doesn't have color attribute but we can add it
planeMesh.geometry.setAttribute(
  "color",
  new THREE.BufferAttribute(new Float32Array(colors), 3)
);

//////////////////////////////////////// events

const mouse = { x: undefined, y: undefined };

// center coorditanes for three js coordinates = middle of the screen
// center coorditanes for browser = top left
// so to fix it we need to set x to 0 in the middle, 1 in the right and -1 on the left
addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;
});

//////////////////////////////////////// lights

const light = new THREE.DirectionalLight(0xffffff, 1);
//                 x  y  z
light.position.set(0, 1, 1);
scene.add(light);

// need to add back light because mesh we chose is visible only if there is light on the side
const backLight = new THREE.DirectionalLight(0xffffff, 1);
backLight.position.set(0, 0, -1);
scene.add(backLight);

////////////////////////////////////////

let frame = 0;
function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
  raycaster.setFromCamera(mouse, camera);
  frame += FRAME_STEP;

  const { array, originalPosition, randomValues } =
    planeMesh.geometry.attributes.position;
  for (let i = 0; i < array.length; i += RGB_COLOR_COUNT) {
    array[i] = originalPosition[i] + Math.cos(frame + randomValues[i]) * FRAME_COS_COEFFICIENT;
    array[i + 1] =
      originalPosition[i + 1] + Math.sin(frame + randomValues[i + 1]) * FRAME_COS_COEFFICIENT;
  }

  // if position is changing you need to tell it directly
  planeMesh.geometry.attributes.position.needsUpdate = true;

  // array of hovered objects
  const intersects = raycaster.intersectObject(planeMesh);
  if (intersects.length > 0) {
    const { a, b, c } = intersects[0].face;
    const { color: intersectColor } = intersects[0].object.geometry.attributes;

    const initialColor = {
      r: 0,
      g: 0.19,
      b: 0.4,
    };

    const hoverColor = {
      r: 0.1,
      g: 0.5,
      b: 1,
    };
    gsap.to(hoverColor, {
      r: initialColor.r,
      g: initialColor.g,
      b: initialColor.b,
      onUpdate: () => {
        intersectColor.setX(a, hoverColor.r);
        intersectColor.setY(a, hoverColor.g);
        intersectColor.setZ(a, hoverColor.b);

        intersectColor.setX(b, hoverColor.r);
        intersectColor.setY(b, hoverColor.g);
        intersectColor.setZ(b, hoverColor.b);

        intersectColor.setX(c, hoverColor.r);
        intersectColor.setY(c, hoverColor.g);
        intersectColor.setZ(c, hoverColor.b);

        // update the color
        intersectColor.needsUpdate = true;
      },
    });
  }
}

animate();

function generatePlane() {
  planeMesh.geometry.dispose();
  planeMesh.geometry = new THREE.PlaneGeometry(
    world.plane.width,
    world.plane.height,
    world.plane.widthSegments,
    world.plane.heightSegments
  );
  const planeGeometryArray = planeMesh.geometry.attributes.position.array;

  for (let i = 0; i < planeGeometryArray.length; i += RGB_COLOR_COUNT) {
    const x = planeGeometryArray[i];
    const y = planeGeometryArray[i + 1];
    const z = planeGeometryArray[i + 2];

    planeGeometryArray[i] = x + Math.random() - 0.5;
    planeGeometryArray[i + 1] = y + Math.random() - 0.5;
    planeGeometryArray[i + 2] = z + Math.random();
  }

  const colors = [];
  for (let i = 0; i < planeMesh.geometry.attributes.position.count; i++) {
    colors.push(0, 0.19, 0.4);
  }

  // r g b = 3
  // initially mesh doesn't have color attribute but we can add it
  planeMesh.geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(colors), RGB_COLOR_COUNT)
  );

  planeMesh.geometry.attributes.position.originalPosition = [
    ...planeGeometryArray,
  ];
  planeMesh.geometry.attributes.position.randomValues = [...randomValues];
}
