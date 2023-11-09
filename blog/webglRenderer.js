var matWorldUniformLocation;
var objectMatrix;
var viewMatrix;

var cameraPosition = [0,1,0];
var cameraLookat = [0,1,0];
var cameraUp = [0,1,0];

var shaders = ['shaders/vertexShader.glsl', 'shaders/fragmentShader.glsl'];
var shaderTypes = ['vertex', 'fragment'];
var shaderResources;
var models = ['juce.json'];
var modelResources;
var textures = ['spitsDrink.png'];
var textureResources;

var gameObjects;

var resourceCount;
var drawCalls;

var Initialize = function () {
    resourceCount = models.length + textures.length + shaders.length;
    var loadedResources = 0;

    modelResources = new Array(models.length);
    for (let i = 0; i < models.length; i++) {
        loadJSONResource( models[i], function (modelerr, modelObject) {
            modelResources[i] = modelObject;
            checkCompletion();
    } ); } 

    shaderResources = new Array(shaders.length);
    for (let i = 0; i < shaders.length; i++) {
        loadTextResource( shaders[i], function (shadererr, shader) {
            shaderResources[i] = shader;
            checkCompletion();
    } ); } 

    textureResources = new Array(textures.length);
    for (let i = 0; i < textures.length; i++) {
        loadImage( textures[i], function (shadererr, tex) {
            textureResources[i] = tex;
            checkCompletion();
    } ); } 

    checkCompletion = function () {
        loadedResources++;
        console.log(loadedResources + "/" + resourceCount + " resources loaded!");
        if (loadedResources >= resourceCount) runRenderer();
    }
}

var compileShader = function (shaderSource,shaderType,gl) {
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        console.error('shader comp error:', gl.getShaderInfoLog(shader));
    return shader;
}

var compileShaderProgram = function (gl,shaderResources) {
    var compiledShaders = new Array(shaderResources.length);
    for (let i = 0; i < shaderResources.length; i++) 
        compiledShaders[i] = compileShader(shaderResources[i], (shaderTypes[i] == "vertex") ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER ,gl);

    var program = gl.createProgram();
    compiledShaders.forEach(shader => gl.attachShader(program, shader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.error('shader program linking error:', gl.getProgramInfoLog(program));

    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS))
        console.error('shader program validating error:', gl.getProgramInfoLog(program));

    return program;
}

var gpuBuffer = function (gl,program,Vertices,Indices,TexCoords) {
    var VertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Vertices), gl.STATIC_DRAW);

    var IndexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IndexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Indices), gl.STATIC_DRAW);

    var TexCoordBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, TexCoordBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(TexCoords), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, VertexBufferObject);
    var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
    gl.vertexAttribPointer(
        positionAttribLocation, //location
        3, //number
        gl.FLOAT, // type
        gl.FALSE, //normalized
        3 * Float32Array.BYTES_PER_ELEMENT, //size
        0 //offset
    );
    gl.enableVertexAttribArray(positionAttribLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, TexCoordBufferObject);
    var texCoordsAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');
    gl.vertexAttribPointer(
        texCoordsAttribLocation, //location
        2, //number
        gl.FLOAT, //type
        gl.FALSE, //normalized
        2 * Float32Array.BYTES_PER_ELEMENT, //size
        0 //offset
    );
    gl.enableVertexAttribArray(texCoordsAttribLocation);
}

var bindTexture = function(gl,tex) {
    var Texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, Texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
		gl.UNSIGNED_BYTE,
		tex
	);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return Texture;
}

var setTransformationMatrecies = function(gl,program, fov, aspect, clipNear, clipFar) {
    objectMatrix = new Float32Array(16);
	glMatrix.mat4.identity(objectMatrix);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mObject'), gl.FALSE, objectMatrix);

	viewMatrix = new Float32Array(16);
	glMatrix.mat4.lookAt(viewMatrix, cameraPosition, cameraLookat, cameraUp);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mView'), gl.FALSE, viewMatrix);

	var projMatrix = new Float32Array(16);
	glMatrix.mat4.perspective(projMatrix, glMatrix.glMatrix.toRadian(fov), aspect, clipNear, clipFar);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mProj'), gl.FALSE, projMatrix);
}

var mooveCamera = function (gl, program, position, lookat, up) {
	glMatrix.mat4.lookAt(viewMatrix, position, lookat, up);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mView'), gl.FALSE, viewMatrix);
}


var runRenderer = function () {
    var canvas = document.getElementById('webglCanvas');
    var gl = canvas.getContext('webgl');
    if (!gl) gl = canvas.getContext('experimental-webgl');

    gl.enable(gl.DEPTH_TEST);

    //backface culling
    // gl.enable(gl.CULL_FACE);
    // gl.frontFace(gl.CCW);
	// gl.cullFace(gl.BACK);
    
    var program = compileShaderProgram(gl, shaderResources);
    gl.useProgram(program);
    setTransformationMatrecies(gl,program, 70, canvas.clientWidth / canvas.clientHeight, 0.01, 10000.0, [0, -.2, -1], [0, .2, 0], [0, 1, 0]);
    
    gameObjects = [
        new GameObject(modelResources[0],textureResources[0],[0,0,0]),
        new GameObject(modelResources[0],textureResources[0],[.3,0,-1]),
        new GameObject(modelResources[0],textureResources[0],[.7,0,0]),
        new GameObject(null,null,[0,0,0],function() {})
    ];
    
    var loop = function () {
        drawCalls = 0;

        //GAME LOGIC
        gameObjects.forEach(object => {
            if (object.update != null) object.update();
        });
        
        mooveCamera(gl, program, [0, -.2, -1], [0, .2, 1], [0, 1, 0]);

        gl.clearColor(0, 0, 0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        gameObjects.forEach(object => {
            if (object.model == null) return;

            var Vertices = object.model.meshes[0].vertices;
            var Indices = [].concat.apply([], object.model.meshes[0].faces);
            var TexCoords = object.model.meshes[0].texturecoords[0];
            gpuBuffer(gl,program,Vertices,Indices,TexCoords);

            var Texture = bindTexture(gl,object.texture);
            gl.bindTexture(gl.TEXTURE_2D,Texture);
            gl.activeTexture(gl.TEXTURE0);

            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mObject'), gl.FALSE, object.transformMatrix);
            
            gl.drawElements(gl.TRIANGLES, Indices.length, gl.UNSIGNED_SHORT, 0);
            drawCalls++;
        });

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

class GameObject {
    constructor(model,texture,position,update) {
        this.model = model
        this.transformMatrix = new Float32Array(16);
        glMatrix.mat4.identity(this.transformMatrix);
        glMatrix.mat4.translate(this.transformMatrix,this.transformMatrix,position);
        this.texture = texture;
        this.update = update;
    }

    translate(position) {
        glMatrix.mat4.translate(this.transformMatrix,this.transformMatrix,position);
    }

    scale(scale) {
        glMatrix.mat4.scale(this.transformMatrix,this.transformMatrix,scale);
    }

    rotate(angle,axis){
        glMatrix.mat4.rotate(this.transformMatrix,this.transformMatrix,angle,axis);
    }
}

//test with: python3 -m http.server @ http://localhost:8000/blog/webglTest.html
//generate json models .\\assimp2json.exe 'source.fbx' 'destination.json'