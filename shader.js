const vertexShaderSource = `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexNormal;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform vec3 uLightPosition;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vLightPos;
    
    void main(void) {
        vec4 vertexPosition = uModelViewMatrix * vec4(aVertexPosition, 1.0);
        gl_Position = uProjectionMatrix * vertexPosition;
        
        vNormal = mat3(uModelViewMatrix) * aVertexNormal;
        vPosition = vertexPosition.xyz;
        vLightPos = (uModelViewMatrix * vec4(uLightPosition, 1.0)).xyz;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vLightPos;
    
    void main(void) {
        // Get the normal and flip it if we're looking at the back face
        vec3 normal = normalize(gl_FrontFacing ? vNormal : -vNormal);
        
        vec3 ambient = vec3(0.4, 0.4, 0.4);
        vec3 diffuse = vec3(0.8, 0.8, 0.8);
        vec3 specular = vec3(1.0, 1.0, 1.0);
        float shininess = 16.0;
        
        vec3 lightDir = normalize(vLightPos - vPosition);
        vec3 viewDir = normalize(-vPosition);
        vec3 reflectDir = reflect(-lightDir, normal);
        
        float diff = max(dot(normal, lightDir), 0.0) * 1.2;
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess) * 1.5;
        
        vec3 baseColor = vec3(0.7, 0.7, 1.0);
        vec3 finalColor = (ambient + diffuse * diff + specular * spec) * baseColor;
        finalColor = min(finalColor, vec3(1.0));
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;