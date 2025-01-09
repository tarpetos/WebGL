let gl;
let surface;
let rotator;
let buffers;
let programInfo;
let then = 0;

function init() {
    try {
        let canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
        console.log("WebGL context initialized successfully");

        initializeShaderProgram();
        if (!programInfo) {
            throw "Failed to initialize shader program";
        }
        console.log("Shader program initialized successfully");

        surface = CreateSurfaceData();
        console.log("Surface data created:", surface);

        buffers = initBuffers(gl, surface);
        if (!buffers) {
            throw "Failed to initialize buffers";
        }
        console.log("Buffers initialized successfully");

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        rotator = new TrackballRotator(gl.canvas, draw, 15);

        requestAnimationFrame(animate);

    } catch (e) {
        console.error("Initialization failed:", e);
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize WebGL: " + e + "</p>";

    }
}

function initializeShaderProgram() {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }

    programInfo = {
        program: program,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(program, 'aVertexNormal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
            lightPosition: gl.getUniformLocation(program, 'uLightPosition'),
        },
    };
}

function CreateSurfaceData() {
    let vertices = [];
    let indices = [];

    const m = 6;
    const b = 6;
    const a = 4;
    const n = 0.5;
    const phi = 0;
    const omega = m * Math.PI / b;

    const uSteps = parseInt(document.getElementById("uStepsSlider").value);
    const vSteps = parseInt(document.getElementById("vStepsSlider").value);

    const MAX_U = Math.PI * 2;
    const STEP_U = MAX_U / uSteps;
    const STEP_R = b / vSteps;

    for (let ri = 0; ri <= vSteps; ri++) {
        const r = ri * STEP_R;
        for (let ui = 0; ui <= uSteps; ui++) {
            const u = ui * STEP_U;

            const x = r * Math.cos(u);
            const y = r * Math.sin(u);
            const z = a * Math.exp(-n * r) * Math.sin(omega * r + phi);

            const scaler = 0.3;
            vertices.push(scaler * x, scaler * y, scaler * z);

            if (ri < vSteps && ui < uSteps) {
                const currentRow = ri * (uSteps + 1);
                const nextRow = (ri + 1) * (uSteps + 1);

                indices.push(
                    currentRow + ui,
                    nextRow + ui,
                    currentRow + ui + 1
                );

                indices.push(
                    currentRow + ui + 1,
                    nextRow + ui,
                    nextRow + ui + 1
                );
            }
        }
    }

    return {
        vertices: vertices,
        indices: indices
    };
}

function initBuffers(gl, surfaceData) {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(surfaceData.vertices), gl.STATIC_DRAW);

    const normals = calculateNormals(surfaceData.vertices, surfaceData.indices);
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(surfaceData.indices), gl.STATIC_DRAW);

    return {
        vertexBuffer,
        normalBuffer,
        indexBuffer,
        numIndices: surfaceData.indices.length
    };
}

function calculateNormals(vertices, indices) {
    const normals = new Array(vertices.length).fill(0);

    for (let i = 0; i < indices.length; i += 3) {
        const i1 = indices[i] * 3;
        const i2 = indices[i + 1] * 3;
        const i3 = indices[i + 2] * 3;

        const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
        const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
        const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];

        const vec1 = [
            v2[0] - v1[0],
            v2[1] - v1[1],
            v2[2] - v1[2]
        ];
        const vec2 = [
            v3[0] - v1[0],
            v3[1] - v1[1],
            v3[2] - v1[2]
        ];

        const normal = [
            vec1[1] * vec2[2] - vec1[2] * vec2[1],
            vec1[2] * vec2[0] - vec1[0] * vec2[2],
            vec1[0] * vec2[1] - vec1[1] * vec2[0]
        ];

        const length = Math.sqrt(
            normal[0] * normal[0] +
            normal[1] * normal[1] +
            normal[2] * normal[2]
        );

        normal[0] /= length;
        normal[1] /= length;
        normal[2] /= length;

        for (let j = 0; j < 3; j++) {
            const vertexIndex = indices[i + j] * 3;
            normals[vertexIndex] += normal[0];
            normals[vertexIndex + 1] += normal[1];
            normals[vertexIndex + 2] += normal[2];
        }
    }

    for (let i = 0; i < normals.length; i += 3) {
        const length = Math.sqrt(
            normals[i] * normals[i] +
            normals[i + 1] * normals[i + 1] +
            normals[i + 2] * normals[i + 2]
        );
        if (length > 0) {
            normals[i] /= length;
            normals[i + 1] /= length;
            normals[i + 2] /= length;
        }
    }

    return normals;
}
function draw() {
    if (!gl || !programInfo || !buffers) {
        console.error("Required resources not initialized");
        return;
    }

    gl.clearColor(0.15, 0.15, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);

    const fieldOfView = Math.PI / 4;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = m4.perspective(fieldOfView, aspect, zNear, zFar);

    let modelViewMatrix = rotator.getViewMatrix();
    modelViewMatrix = m4.translate(modelViewMatrix, 0, -0.5, -2);

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    const currentTime = performance.now();
    const lightRadius = 3.0;
    const lightPosition = [
        lightRadius * Math.cos(currentTime * 0.001),
        lightRadius * Math.sin(currentTime * 0.001),
        2.0
    ];
    gl.uniform3fv(programInfo.uniformLocations.lightPosition, lightPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, buffers.numIndices, gl.UNSIGNED_SHORT, 0);
}

function animate(now) {
    now *= 0.001;
    then = now;

    draw();
    requestAnimationFrame(animate);
}

function updateSurface() {
    surface = CreateSurfaceData();
    buffers = initBuffers(gl, surface);

    document.getElementById("uStepsValue").textContent = document.getElementById("uStepsSlider").value;
    document.getElementById("vStepsValue").textContent = document.getElementById("vStepsSlider").value;

    draw();
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}