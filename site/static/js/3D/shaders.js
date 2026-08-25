


export const vertexShader = `
    attribute vec3 vertex_position;
    
    uniform mat4 model_view;
    uniform mat4 projection;

    void main(void) {
        gl_Position = projection * (model_view * vec4(vertex_position, 1.0));
        gl_PointSize = 1.0;
    }
`;


export const fragmentShader = `
    precision mediump float;
    uniform vec4 color;
    void main(void) {
        gl_FragColor = color;
    }
`;
