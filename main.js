let gl;
let surface;
let rotator;
let buffers;
let programInfo;
let textures;
let then = 0;
let texturePoint = { u: 0.5, v: 0.5 };
let textureScale = 1.0;
const POINT_MOVE_SPEED = 0.01;
const SCALE_MIN = 0.5;
const SCALE_MAX = 4.0;

function initKeyboardControls() {
    document.addEventListener("keydown", (event) => {
        switch(event.key.toUpperCase()) {
            case "W":
                texturePoint.v = Math.max(0, texturePoint.v - POINT_MOVE_SPEED);
                break;
            case "S":
                texturePoint.v = Math.min(1, texturePoint.v + POINT_MOVE_SPEED);
                break;
            case "A":
                texturePoint.u = Math.max(0, texturePoint.u - POINT_MOVE_SPEED);
                break;
            case "D":
                texturePoint.u = Math.min(1, texturePoint.u + POINT_MOVE_SPEED);
                break;
            case "Q":
                textureScale = Math.max(SCALE_MIN, textureScale - 0.1);
                break;
            case "E":
                textureScale = Math.min(SCALE_MAX, textureScale + 0.1);
                break;
        }
        draw();
    });
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const pixel = new Uint8Array([0, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    const image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url;
    return texture;
}

function initTextures(gl) {
    const textures = {
        diffuse: loadTexture(gl, "Textures/diffuse.png"),
        specular: loadTexture(gl, "Textures/specular.png"),
        normal: loadTexture(gl, "Textures/normal.png")
    };

    Object.values(textures).forEach(texture => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    });

    return textures;
}

function CreateSurfaceData() {
    const vertices = [];
    const indices = [];
    const texCoords = [];
    const tangents = [];
    const m = 6, b = 6, a = 4, n = 0.5, phi = 0;
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
            texCoords.push(ui / uSteps, ri / vSteps);
            const tangent = [-r * Math.sin(u), r * Math.cos(u), 0];
            const len = Math.sqrt(tangent[0] * tangent[0] + tangent[1] * tangent[1] + tangent[2] * tangent[2]);
            tangents.push(tangent[0]/len, tangent[1]/len, tangent[2]/len);

            if (ri < vSteps && ui < uSteps) {
                const currentRow = ri * (uSteps + 1);
                const nextRow = (ri + 1) * (uSteps + 1);
                indices.push(
                    currentRow + ui,
                    nextRow + ui,
                    currentRow + ui + 1,
                    currentRow + ui + 1,
                    nextRow + ui,
                    nextRow + ui + 1
                );
            }
        }
    }

    return {vertices, indices, texCoords, tangents};
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
        const vec1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
        const vec2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
        const normal = [
            vec1[1] * vec2[2] - vec1[2] * vec2[1],
            vec1[2] * vec2[0] - vec1[0] * vec2[2],
            vec1[0] * vec2[1] - vec1[1] * vec2[0]
        ];
        const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
        normal.forEach((val, idx) => normal[idx] = val / length);
        for (let j = 0; j < 3; j++) {
            const vertexIndex = indices[i + j] * 3;
            normals[vertexIndex] = normal[0];
            normals[vertexIndex + 1] = normal[1];
            normals[vertexIndex + 2] = normal[2];
        }
    }
    return normals;
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

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(surfaceData.texCoords), gl.STATIC_DRAW);

    const tangentBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(surfaceData.tangents), gl.STATIC_DRAW);

    return {
        vertexBuffer,
        normalBuffer,
        indexBuffer,
        texCoordBuffer,
        tangentBuffer,
        numIndices: surfaceData.indices.length
    };
}

function initializeShaderProgram() {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader program linking error: " + gl.getProgramInfoLog(program));
        return null;
    }

    programInfo = {
        program: program,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
            vertexNormal: gl.getAttribLocation(program, "aVertexNormal"),
            textureCoord: gl.getAttribLocation(program, "aTextureCoord"),
            vertexTangent: gl.getAttribLocation(program, "aVertexTangent"),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(program, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(program, "uModelViewMatrix"),
            lightPosition: gl.getUniformLocation(program, "uLightPosition"),
            diffuseMap: gl.getUniformLocation(program, "uDiffuseMap"),
            specularMap: gl.getUniformLocation(program, "uSpecularMap"),
            normalMap: gl.getUniformLocation(program, "uNormalMap"),
            texturePoint: gl.getUniformLocation(program, "uTexturePoint"),
            textureScale: gl.getUniformLocation(program, "uTextureScale"),
        },
    };
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function draw() {
    if (!gl || !programInfo || !buffers) return;

    gl.clearColor(0.15, 0.15, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    const fieldOfView = Math.PI / 4;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fieldOfView, aspect, 0.1, 100.0);
    let modelViewMatrix = rotator.getViewMatrix();
    modelViewMatrix = m4.translate(modelViewMatrix, 0, -0.5, -2);

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    const currentTime = performance.now();
    const lightPosition = [
        3.0 * Math.cos(currentTime * 0.001),
        3.0 * Math.sin(currentTime * 0.001),
        2.0
    ];
    gl.uniform3fv(programInfo.uniformLocations.lightPosition, lightPosition);

    gl.uniform2f(programInfo.uniformLocations.texturePoint, texturePoint.u, texturePoint.v);
    gl.uniform1f(programInfo.uniformLocations.textureScale, textureScale);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.diffuse);
    gl.uniform1i(programInfo.uniformLocations.diffuseMap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.specular);
    gl.uniform1i(programInfo.uniformLocations.specularMap, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textures.normal);
    gl.uniform1i(programInfo.uniformLocations.normalMap, 2);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoordBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tangentBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexTangent, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexTangent);

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

function init() {
    try {
        let canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) throw "Browser does not support WebGL";

        initializeShaderProgram();
        if (!programInfo) throw "Failed to initialize shader program";

        textures = initTextures(gl);
        surface = CreateSurfaceData();
        buffers = initBuffers(gl, surface);
        if (!buffers) throw "Failed to initialize buffers";

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        initKeyboardControls();
        rotator = new TrackballRotator(gl.canvas, draw, 15);
        requestAnimationFrame(animate);

    } catch (e) {
        console.error("Initialization failed:", e);
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize WebGL: " + e + "</p>";
    }
}