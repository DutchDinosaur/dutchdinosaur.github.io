var matWorldUniformLocation;
var objectMatrix;
var viewMatrix;

var shaders = ['shaders/vertexShader.glsl', 'shaders/fragmentShader.glsl'];
var shaderTypes = ['vertex', 'fragment'];
var shaderResources;
var models = ['pond2.json','archie.json'];
var modelResources;
var textures = ['pondtex.png', 'archietex.png'];
var textureResources;

var renderObjects;
var gameObjects;

//diagnostics
var resourceCount;
var drawCalls;
let deltaTime;
let targetFPS = 60;

var VBO;
var IBO;

var positionAttribLocation;
var texCoordsAttribLocation;
var objectUniformLocation;
var cameraUniformLocation;

//KEEP THEESE SORTED
gameObjects = [
    new GameObject(0,[0,-1,0])
    // ,new GameObject(1,[0,1,0])
];

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

var generateVBOs = function (gl,renderObject) {

    var vbo = [];
    var ibo = [];
    var VBOOffset = 0;
    var indexOffset = 0;
    for (let o = 0; o < renderObject.length; o++) {
        var Vertices = renderObject[o].model.meshes[0].vertices;
        var TexCoords = renderObject[o].model.meshes[0].texturecoords[0];

        var objectVBO = new Float32Array(Vertices.length + TexCoords.length);
        var vboIndex = 0;
        var TCIndex = 0;
        for (let v = 0; v < Vertices.length; v += 3) {
            objectVBO[vboIndex] = Vertices[v];
            objectVBO[vboIndex+1] = Vertices[v+1];
            objectVBO[vboIndex+2] = Vertices[v+2];
            objectVBO[vboIndex+3] = TexCoords[TCIndex];
            objectVBO[vboIndex+4] = TexCoords[TCIndex+1];
            TCIndex += 2;
            vboIndex += 5;
        }

        var objectIBO = [].concat.apply([], renderObject[o].model.meshes[0].faces);
        if (indexOffset != 0) for (let i = 0; i < objectIBO.length; i++) objectIBO[i] += indexOffset/3;

        renderObject[o].indexCount = objectIBO.length;
        renderObject[o].vertCount = Vertices.length;
        renderObject[o].vboOffset = VBOOffset * Uint16Array.BYTES_PER_ELEMENT;
        VBOOffset += objectIBO.length;
        indexOffset += Vertices.length;

        vbo = [].concat.apply(vbo,objectVBO);
        ibo = [].concat.apply(ibo,objectIBO);
    }

    VBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vbo), gl.STATIC_DRAW);

    IBO = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ibo), gl.STATIC_DRAW);

    gl.vertexAttribPointer(
        positionAttribLocation, //location
        3, //number
        gl.FLOAT, // type
        gl.FALSE, //normalized
        5 * Float32Array.BYTES_PER_ELEMENT, //size
        0 //offset
    );

    gl.vertexAttribPointer(
        texCoordsAttribLocation, //location
        2, //number
        gl.FLOAT, //type
        gl.FALSE, //normalized
        5 * Float32Array.BYTES_PER_ELEMENT, //size
        3 * Float32Array.BYTES_PER_ELEMENT //offset
    );

    gl.enableVertexAttribArray(positionAttribLocation);
    gl.enableVertexAttribArray(texCoordsAttribLocation);
}

var setTransformationMatrecies = function(gl,program, fov, aspect, clipNear, clipFar) {
    objectMatrix = new Float32Array(16);
	glMatrix.mat4.identity(objectMatrix);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mObject'), gl.FALSE, objectMatrix);

	viewMatrix = new Float32Array(16);
	glMatrix.mat4.lookAt(viewMatrix, [5,2,3], [0,0,0], [0,1,0]);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mView'), gl.FALSE, viewMatrix);

	var projMatrix = new Float32Array(16);
	glMatrix.mat4.perspective(projMatrix, glMatrix.glMatrix.toRadian(fov), aspect, clipNear, clipFar);
	gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mProj'), gl.FALSE, projMatrix);
}

var runRenderer = function () {
    var canvas = document.getElementById('webglCanvas');
    var gl = canvas.getContext('webgl', { antialias: false } );
    if (!gl) gl = canvas.getContext('experimental-webgl');

    gl.enable(gl.DEPTH_TEST);

    //backface culling
    gl.enable(gl.CULL_FACE);
    // gl.frontFace(gl.CCW);
	// gl.cullFace(gl.BACK);
    
    var program = compileShaderProgram(gl, shaderResources);
    gl.useProgram(program);

    positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
    texCoordsAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');
    objectUniformLocation = gl.getUniformLocation(program, 'mObject');
    cameraUniformLocation = gl.getUniformLocation(program, 'mView');
    setTransformationMatrecies(gl,program, 70, canvas.clientWidth / canvas.clientHeight, 0.1, 1000.0);
    
    renderObjects = [
        new RenderObject(modelResources[0],initializeTexture(gl,textureResources[0]),program, "pond")
        ,new RenderObject(modelResources[1],initializeTexture(gl,textureResources[1]),program, "archie")
    ];

    generateVBOs(gl,renderObjects);

    gameObjects[0].update = () => {rotateCam(gl,0)};

    let then = 0;
    var loop = function (now) {
        drawCalls = 0;
        now *= 0.001;
        deltaTime = now - then;
        then = now;

        //GAME LOGIC
        gameObjects.forEach(object => {
            if (object.update != null) object.update();
        });
        
        gl.clearColor(0, 0, 0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var lastRenderObject = null;
        gameObjects.forEach(object => {
            if (object.renderObject == null || object.active == false) return;
            if (object.renderObject != lastRenderObject) {
                gl.bindTexture(gl.TEXTURE_2D,renderObjects[object.renderObject].texture);
                gl.activeTexture(gl.TEXTURE0);
                //gl.useProgram(object.program);
                lastRenderObject = object.renderObject;
            }
            gl.uniformMatrix4fv(objectUniformLocation, gl.FALSE, object.transformMatrix);
            gl.drawElements(gl.TRIANGLES, renderObjects[object.renderObject].indexCount, gl.UNSIGNED_SHORT, renderObjects[object.renderObject].vboOffset);
            drawCalls++;
        });

        setTimeout(() => {
            requestAnimationFrame(loop);
        }, 1000 / targetFPS);
    }
    requestAnimationFrame(loop);
}

//test with: python3 -m http.server @ http://localhost:8000/blog/webglTest.html
//generate json models E:\Program Files\assimp2json-2.0-win32\Release .\\assimp2json.exe 'source.fbx' 'destination.json' 