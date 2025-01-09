'use strict';

let gl;
let shProgram;
let spaceball;
let surfaceU;
let surfaceV;

function Model() {
    this.iVertexBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}

function ShaderProgram(name, program) {
    this.prog = program;

    this.iAttribVertex = -1;
    this.iColor = -1;
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}

function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniform4fv(shProgram.iColor, [0, 1, 0, 1]);
    surfaceU.Draw();

    gl.uniform4fv(shProgram.iColor, [0, 1, 0, 1]);
    surfaceV.Draw();
}

function CreateSurfaceData() {
    let uVertexList = [];
    let vVertexList = [];

    const m = 6;
    const b = 6;
    const a = 4;
    const n = 0.5;
    const phi = 0;
    const omega = m * Math.PI / b;

    const NUM_STEPS_U = 30;
    const NUM_STEPS_R = 60;
    const MAX_U = Math.PI * 2;
    const STEP_U = MAX_U / NUM_STEPS_U;
    const STEP_R = b / NUM_STEPS_R;

    for (let r = 0; r <= b; r += STEP_R) {
        for (let u = 0; u <= MAX_U; u += STEP_U) {
            let vertex = calculateVertex(r, u, a, n, omega, phi);
            uVertexList.push(...vertex);
        }
    }

    for (let u = 0; u < MAX_U; u += STEP_U) {
        for (let r = 0; r <= b; r += STEP_R) {
            let vertex = calculateVertex(r, u, a, n, omega, phi);
            vVertexList.push(...vertex);
        }
    }

    return {uVertexList, vVertexList};
}

function calculateVertex(r, u, a, n, omega, phi) {
    const x = r * Math.cos(u);
    const y = r * Math.sin(u);
    const z = a * Math.exp(-n * r) * Math.sin(omega * r + phi);

    const scaler = 0.1;
    return [scaler * x, scaler * y, scaler * z];
}


function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");

    const surfaceData = CreateSurfaceData();

    surfaceU = new Model('SurfaceU');
    surfaceU.BufferData(surfaceData.uVertexList);

    surfaceV = new Model('SurfaceV');
    surfaceV.BufferData(surfaceData.vVertexList);

    gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);

    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);

    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }

    let fsh = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);

    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }

    let prog = gl.createProgram();

    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }

    return prog;
}

function init() {
    let canvas;

    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");

        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML = "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }

    try {
        initGL();
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML = "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}
