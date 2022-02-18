import * as THREE from 'https://cdn.skypack.dev/three@0.136.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/libs/lil-gui.module.min';
import { HTMLMesh } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/interactive/HTMLMesh.js';
import { VRButton } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/webxr/VRButton.js';
import { InteractiveGroup } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/interactive/InteractiveGroup.js';
import { XRControllerModelFactory } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/webxr/XRControllerModelFactory.js';

var camera, controls, scene, renderer, container;

// VIDEO AND THE ASSOCIATED TEXTURE
var video,videoTexture;

var imageProcessingMaterial, basicElevationMaterial;

// GUI
var gui;

init();
animate();

function init () {
	
    container = document.createElement( 'div' );
	document.body.appendChild( container );
	
	scene = new THREE.Scene();
	//scene.background = new THREE.Color('white');

	const textureEquirec = new THREE.TextureLoader().load( 'texturemap.jpeg' );
	textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
	textureEquirec.encoding = THREE.sRGBEncoding;
	scene.background = textureEquirec;
	scene.rotation.y = Math.PI/2;


	renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
	renderer.autoClear = false;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = false;
	document.body.appendChild( VRButton.createButton( renderer ) );
	renderer.xr.enabled = true;

	container.appendChild( renderer.domElement );

	camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.001, 100 );
	//camera.rotation.z = -Math.PI/2;
	camera.position.set(1.8504737853629887, 2.7424440783711015, -0.6491972235833712);
	console.log(camera.position);

	// For VR
	const group = new InteractiveGroup( renderer, camera );
	scene.add( group );


	controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 1;
	controls.maxDistance = 50;

	//scene.add(new THREE.AxesHelper(5));

	video = document.createElement('video');
	video.src = 'video.mp4';
	video.load();
	video.muted = true;
	video.loop = true;

	// Asynchronous function for execution when video data is ready
	video.onloadeddata = function (){ 
		videoTexture = new THREE.VideoTexture( video );
		videoTexture.minFilter = THREE.NearestFilter;
		videoTexture.magFilter = THREE.NearestFilter;
		videoTexture.generateMipmaps = false; 
		videoTexture.format = THREE.RGBFormat;
		
		imageProcessingMaterial = new THREE.ShaderMaterial({
			uniforms: {
				curvature: {type: 'f', value: 3.2},
				image: {type: 't', value: videoTexture},
				screen_color:{value:0},
				resolution: {type: '2f', value:  new THREE.Vector2( video.videoWidth, video.videoHeight ) }
			},
			vertexShader: document.getElementById('vertShader_screen').text,
			fragmentShader: document.getElementById('fragShader_screen').text,
			side : THREE.DoubleSide,
		});

		// Adding Curved Screen
		var scale = 3.0;
		var geometry = new THREE.PlaneGeometry(2*scale, video.videoHeight/video.videoWidth*scale, video.videoWidth, video.videoHeight);
		var screen = new THREE.Mesh( geometry,  imageProcessingMaterial);
		screen.position.set(0, 3, -4);
		screen.receiveShadow = false;
		screen.castShadow = false;
		scene.add(screen);

		// Adding Elevationmap
		var scaleElevation = 0.1;
		var discret = 2;

		basicElevationMaterial = new THREE.ShaderMaterial( {
			uniforms: {
				scaleElevation: { value: scaleElevation },
				image: {type: 't', value: videoTexture},
			},
			vertexShader: document.getElementById('vertShader_map').text,
			fragmentShader: document.getElementById('fragShader_map').text,
		} );

		// Adding Light Source
		var lightDir = new THREE.Vector3 (-0.5, 0.5, 1);
		lightDir.normalize();
		console.log ( lightDir );
		var lightIntensity = 1.25;

		var lightElevationMaterial = new THREE.ShaderMaterial( {
			vertexShader: document.querySelector( '#lightvertexshader' ).textContent.trim(),
			fragmentShader: document.querySelector( '#lightfragmentshader' ).textContent.trim(),
			uniforms: {
				lightDir: { type: '3f', value: lightDir },
				lightIntensity: { value: lightIntensity },
				discret: { value: 2 },
				scaleElevation: { value: scaleElevation },
				image: {type: 't', value: videoTexture},
				stepPixel: { type: '2f', value: new THREE.Vector2( 1.0/(video.videoWidth-1.0), 1.0/(video.videoHeight-1.0) )}
				}
		} );

		// Creating Elevation Map
		var planeGeometry = new THREE.PlaneGeometry(1*scale/2, (video.videoHeight/video.videoWidth)*scale/2, video.videoWidth/discret, video.videoHeight/discret );  
		var plane = new THREE.Mesh( planeGeometry, lightElevationMaterial);
		plane.material.side = THREE.DoubleSide;
		plane.position.set(-1.5, 0.85, -1);
		plane.rotateX(-Math.PI/2);
		scene.add(plane);

		/*
		const map_box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1), new THREE.MeshPhysicalMaterial({roughness: 0, transmission: 1, thickness: 0.5,}));
		map_box.position.set(-1.5, 1.5, 2);
		scene.add(map_box);

		const light = new THREE.DirectionalLight('white', 7);
		light.position.set(-1.5, 1.3, 2);
		scene.add(light);

		const map_box_2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1), new THREE.MeshPhysicalMaterial({color: 'gold', roughness: 0.4, metalness: 1,}));
		map_box_2.position.set(-1.5, 1.2, 2);
		scene.add(map_box_2);
		*/

		// Color Cloud Space
		var discret = 1;

		var colorSpaceMaterial = new THREE.ShaderMaterial({
			vertexShader: document.getElementById('RGBVertexShader').textContent,
			fragmentShader: document.getElementById('RGBFragmentShader').textContent,
			uniforms: {
				color_Space:{value:0},
				image: {type: 't', value: videoTexture},
			}
		});

		geometry = new THREE.BufferGeometry();
		const positions = [];
		let compteur = 0;
		for (let i = 0; i < video.videoHeight; i += discret){
			for (let j = 0; j < video.videoWidth; j += discret) {
				// positions
				const x = (i+0.5) / video.videoHeight;
				const y = (j+0.5) / video.videoWidth;
				const z = 0;

				positions.push(x, y, z);
				compteur++;
			}
		}
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.computeBoundingSphere();

		var points = new THREE.Points(geometry, colorSpaceMaterial);
		points.position.set(1.5, 1.5, -2);
		scene.add(points);

		// Point Cloud Shadow
		var colorSpaceShadowMaterial = new THREE.ShaderMaterial({
			vertexShader: document.getElementById('ShadowRGBVertexShader').textContent,
			fragmentShader: document.getElementById('ShadowRGBFragmentShader').textContent,
			uniforms: {
				color_Space:{value:0},
				image: {type: 't', value: videoTexture},
			}
		});
		var shadow_points = new THREE.Points(geometry, colorSpaceShadowMaterial);
		shadow_points.position.set(1.5, 0.9, -2);
		scene.add(shadow_points);

		const light = new THREE.DirectionalLight('white', 7);
		light.position.set(-1.5, 1.3, 2);
		scene.add(light);
		
		const cylinder_r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.75, 64), new THREE.MeshLambertMaterial({color: 'red'}));
		cylinder_r.position.set(1.4, 0.90, -2.75);
		cylinder_r.rotateZ(Math.PI/2);
		scene.add(cylinder_r);

		const cylinder_g = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.75, 64), new THREE.MeshLambertMaterial({color: 'green'}));
		cylinder_g.position.set(2.25, 1.5, -2.75);
		scene.add(cylinder_g);

		const cylinder_b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.75, 64), new THREE.MeshLambertMaterial({color: 'blue'}));
		cylinder_b.position.set(2.25, 0.9, -1.90);
		cylinder_b.rotateX(Math.PI/2);
		scene.add(cylinder_b);

		const cloud_box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5), new THREE.MeshPhysicalMaterial({color: 'silver', metalness: 0.8, roughness: 0, thickness: 0.5,}));
		cloud_box.position.set(1.5, 0.85, -2);
		scene.add(cloud_box);

		/*
		const cloud_box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({roughness: 0, transmission: 1, thickness: 0.5,}));
		cloud_box.position.set(1.5, 1.5, 2);
		scene.add(cloud_box);
		*/

		var pausePlayObj =
		{
			pausePlay: function () 
			{
				if (!video.paused)
				{
					console.log ( "pause" );
					video.pause();
				}
				else
				{
					console.log ( "play" );
					video.play();
				}
			},
			add10sec: function ()
			{
				video.currentTime = video.currentTime + 10;
				console.log ( video.currentTime  );
			}
		};
		
		gui = new GUI({width:300});

		gui.add(imageProcessingMaterial.uniforms.curvature , 'value', 2.5, 10).name('Curvature');
		gui.add(imageProcessingMaterial.uniforms.screen_color , 'value', 0, 3, 1).name('Screen Color');
		gui.add(colorSpaceMaterial.uniforms.color_Space, 'value', 0, 3, 1).name('Color Space').onChange( value => {
			console.log(value);
			colorSpaceShadowMaterial.uniforms.color_Space.value = value;
		} );
		gui.add(pausePlayObj,'pausePlay').name ('Pause/play video');
		gui.add(pausePlayObj,'add10sec').name ('Add 10 seconds');
		gui.domElement.style.visibility = 'hidden';

		// Adding GUI in VR Space
		const group = new InteractiveGroup( renderer, camera );
		scene.add( group );

		const mesh = new HTMLMesh(gui.domElement );
		mesh.position.set(-6, 2, -2);
		mesh.rotateY(Math.PI/4);
		mesh.scale.setScalar(8);
		group.add(mesh);

		video.play();
	};

	// Adding Controller
	const geometry = new THREE.BufferGeometry();
	geometry.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, - 2)]);

	const controller1 = renderer.xr.getController(0);
	controller1.add(new THREE.Line(geometry));
	scene.add(controller1);

	const controller2 = renderer.xr.getController(1);
	controller2.add(new THREE.Line(geometry));
	scene.add(controller2);

	const controllerModelFactory = new XRControllerModelFactory();

	const controllerGrip1 = renderer.xr.getControllerGrip(0);
	controllerGrip1.add( controllerModelFactory.createControllerModel(controllerGrip1));
	scene.add(controllerGrip1);

	const controllerGrip2 = renderer.xr.getControllerGrip(1);
	controllerGrip2.add( controllerModelFactory.createControllerModel(controllerGrip2));
	scene.add(controllerGrip2);
		
}

function render(){
	renderer.render(scene, camera);
}

// DRAW Function in VR
function animate(){
renderer.setAnimationLoop( render );
}
