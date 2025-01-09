const vertexShaderSource = `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;
    attribute vec3 aVertexTangent;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform vec3 uLightPosition;
    
    varying vec3 vNormal;
    varying vec3 vTangent;
    varying vec3 vPosition;
    varying vec2 vTextureCoord;
    varying vec3 vLightPos;
    varying vec3 vViewPos;
    
    void main(void) {
        vec4 vertexPosition = uModelViewMatrix * vec4(aVertexPosition, 1.0);
        gl_Position = uProjectionMatrix * vertexPosition;
        
        vNormal = normalize(mat3(uModelViewMatrix) * aVertexNormal);
        vTangent = normalize(mat3(uModelViewMatrix) * aVertexTangent);
        
        vTangent = normalize(vTangent - dot(vTangent, vNormal) * vNormal);
        vec3 bitangent = cross(vNormal, vTangent);
        
        vPosition = vertexPosition.xyz;
        vTextureCoord = aTextureCoord;
        vLightPos = (uModelViewMatrix * vec4(uLightPosition, 1.0)).xyz;
        vViewPos = -vPosition;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    
    varying vec3 vNormal;
    varying vec3 vTangent;
    varying vec3 vPosition;
    varying vec2 vTextureCoord;
    varying vec3 vLightPos;
    varying vec3 vViewPos;
    
    uniform sampler2D uDiffuseMap;
    uniform sampler2D uSpecularMap;
    uniform sampler2D uNormalMap;
    
    void main(void) {
        vec4 diffuseColor = texture2D(uDiffuseMap, vTextureCoord);
        vec4 specularColor = texture2D(uSpecularMap, vTextureCoord);
        vec4 normalColor = texture2D(uNormalMap, vTextureCoord);
        
        vec3 normalFromMap = normalize(normalColor.rgb * 2.0 - 1.0);
        
        vec3 N = normalize(vNormal);
        vec3 T = normalize(vTangent);
        vec3 B = cross(N, T);
        mat3 TBN = mat3(T, B, N);
        
        vec3 normal = normalize(TBN * normalFromMap);
        
        vec3 lightDir = normalize(vLightPos - vPosition);
        vec3 viewDir = normalize(vViewPos);
        vec3 reflectDir = reflect(-lightDir, normal);
        
        vec3 ambient = vec3(0.2) * diffuseColor.rgb;
        
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * diffuseColor.rgb;
        
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        vec3 specular = spec * specularColor.rgb;
        
        vec3 finalColor = ambient + diffuse + specular;
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;