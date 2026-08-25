import {
  glMatrix,
  mat4,
  vec4,
  vec3,
} from "https://cdn.jsdelivr.net/npm/gl-matrix@3.4.4/+esm";

import { vertexShader, fragmentShader } from "./shaders.js";
import { ObjParser } from "./obj-parser.js";

const modelURL = "/cow";
const parser = new ObjParser();

function identitym4() {
  return mat4.identity(mat4.create());
}

const I = identitym4();

function perps(vec) {
  const perp = math.matrix([-vec.get([1]), vec.get([0])]);
  return [perp, math.multiply(-1, perp)];
}

function rotate_mat4(point, angle, axis) {
  const R = identitym4();
  mat4.rotate(R, R, glMatrix.toRadian(angle), axis);
  const p = vec4.fromValues(point[0], point[1], point[2], 1);
  vec4.transformMat4(p, p, R);
  return math.matrix([p[0], p[1], p[2]]);
}

async function load_mesh(url) {
  const response = await fetch(url);
  const obj_content = await response.text();
  return obj_content;
}

class Camera {
  constructor(pos, look_direction) {
    this.pos = math.matrix(pos);
    this.basis = [
      math.matrix([1, 0, 0]),
      math.matrix([0, 1, 0]),
      math.matrix(look_direction),
    ];
    this.look_direction = this.basis.at(2);
    this.up = this.basis.at(1);
    this.view_matrix = mat4.create();
  }

  get_view_matrix() {
    mat4.lookAt(
      this.view_matrix,
      this.pos.toArray(),
      this.look_direction.toArray(),
      this.up.toArray(),
    );
    return this.view_matrix;
  }

  translate(tvec) {
    this.pos = math.add(this.pos, tvec);
  }

  rotate(angle, axis) {
    // normalize axis (vec3)
    const _axis = vec3.clone(axis);
    vec3.normalize(_axis, _axis);

    this.look_direction = rotate_mat4(
      this.look_direction.toArray(),
      angle,
      _axis,
    );

    // rotate basis (each is vec3 -> vec4 with w=0)
    this.basis = this.basis.map((b) => rotate_mat4(b.toArray(), angle, _axis));
    this.up = this.basis[1];
  }
}

class PropCamera extends Camera {
  // return a math matrix instead
  get_view_matrix() {
    const [b1, b2, b3] = this.basis;
    this.view_matrix = math.matrix([
      [...b1.toArray(), -1 * math.dot(b1, this.pos)],
      [...b2.toArray(), -1 * math.dot(b2, this.pos)],
      [...b3.toArray(), -1 * math.dot(b3, this.pos)],
      [0, 0, 0, 1],
    ]);
    return this.view_matrix;
  }
}

class PropViewport {
  constructor(camera, z_distance, width, height) {
    this.camera = camera;
    this.center = math.add(
      math.matrix(camera.pos),
      math.multiply(z_distance, camera.basis.at(2)),
    );
    this.z_distance = z_distance;
    this.width = width;
    this.height = height;
    this.look = camera.basis.at(2);
    this.init_corners();
  }

  init_corners() {
    const [i, j] = this.camera.basis.slice(0, 2);
    const w = this.width;
    const h = this.height;
    this.corners = [
      math.add(
        this.center,
        math.add(math.multiply(-w / 2, i), math.multiply(h / 2, j)),
      ),
      math.add(
        this.center,
        math.add(math.multiply(w / 2, i), math.multiply(h / 2, j)),
      ),
      math.add(
        this.center,
        math.add(math.multiply(-w / 2, i), math.multiply(-h / 2, j)),
      ),
      math.add(
        this.center,
        math.add(math.multiply(w / 2, i), math.multiply(-h / 2, j)),
      ),
    ];
  }

  adjust_to_camera() {
    this.look = this.camera.basis.at(2);
    this.center = math.add(
      math.matrix(this.camera.pos),
      math.multiply(this.z_distance, this.look),
    );

    this.init_corners();
  }

  translate(tvec) {
    this.center = math.add(this.center, tvec);
    this.init_corners();
  }

  // For display purposes only
  perspective() {
    return math.matrix([
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 1 / this.z_distance],
      [0, 0, 0, 0],
    ]);
  }
  //
}

// Controller for prop simulation
class PropSimulator {
  constructor(...opt_meshes) {
    this.pp_camera = new PropCamera(
      math.matrix([0, 0, 0]),
      math.matrix([0, 0, 1]),
    );
    this.pp_viewport = new PropViewport(this.pp_camera, 3, 4, 4);
    this.pp_perspective = identitym4();
    this.opt_meshes = opt_meshes;
  }

  translate(tvec) {
    this.pp_camera.translate(tvec);
    this.pp_viewport.adjust_to_camera();
  }

  rotate(angle, axis) {
    this.pp_camera.rotate(angle, axis);
    this.pp_viewport.adjust_to_camera();
  }

  draw_prop_camera() {
    return;
  }

  get_prop_perspective() {
    this.pp_perspective = this.pp_viewport.perspective()
    // console.log(this.pp_camera.get_view_matrix())
  }

  draw_projection_lines(controller) {
    const verts = controller.model.vertices;
    const points = [];

    for (let i = 0; i < verts.length; i += 3*4) {
      const p = vec4.fromValues(verts[i], verts[i + 1], verts[i + 2], 1);

      vec4.transformMat4(p, p, controller.model_matrix);

      points.push([p[0], p[1], p[2]], this.pp_camera.pos.toArray());
    }

    controller.draw_lines(points, [1.0, 1.0, 1.0, 0.005]);
  }

  draw_projection_points(controller) {
    const verts = controller.model.vertices;
    const points = [];

    for (let i = 0; i < verts.length; i += 3*4) {
      let p = math.matrix([verts[i], verts[i + 1], verts[i + 2], 1]);
      const model = math.reshape(
        math.matrix(Array.from(controller.model_matrix)),
        [4, 4],
      );
      p = math.multiply(p, model)
      p = math.multiply(p, this.pp_perspective);

      const w = p.get([3]);
      // perspective divide
      points.push([p.get([0]) / w, p.get([1]) / w, p.get([2]) / w]);
    }

    controller.draw_points(points, [1.0, 0, 0.0, 0.6]);
  }

  draw_prop_viewport(controller) {
    const top_pos = this.pp_viewport.corners.at(0);
    const [i, j] = this.pp_camera.basis.slice(0, 2);
    const w = this.pp_viewport.width;
    const h = this.pp_viewport.height;
    controller.draw_rect(top_pos.toArray(), i, j, w, h);
  }

  draw_cosmetics(controller) {
    controller.draw_lines(
      [
        this.pp_camera.pos.toArray(),
        this.pp_viewport.corners.at(0).toArray(),

        this.pp_camera.pos.toArray(),
        this.pp_viewport.corners.at(1).toArray(),

        this.pp_camera.pos.toArray(),
        this.pp_viewport.corners.at(2).toArray(),

        this.pp_camera.pos.toArray(),
        this.pp_viewport.corners.at(3).toArray(),
      ],
      [0, 0, 0, 0.25],
    );
  }

  draw_this(controller) {
    this.draw_prop_camera(controller);
    this.draw_prop_viewport(controller);
    this.draw_cosmetics(controller);
  }
}

class InputHandler {
  constructor(controller) {
    this.prop_sim = controller.prop_sim;
    this.controller = controller;
    this.keys = {};
    window.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });
  }

  onMouseMove(e) {
    const deltaX = e.movementX;
    const deltaY = e.movementY;
    this.controller.rotate_mesh(deltaX * 0.01, [0, 1, 0])
    this.controller.rotate_mesh(deltaY * 0.01, [1, 0, 1])
    // this.prop_sim.rotate(deltaX * 0.3, [0, 1, 0]);
    // this.prop_sim.rotate(deltaY * 0.3, [1, 0, 0]);
  }
}

class webglController {
  constructor(canvas_object) {
    this.canvas = canvas_object;
    this.gl = canvas_object.getContext("webgl");
    this.vertex_buffer = this.gl.createBuffer();
    this.index_buffer = this.gl.createBuffer();
    this.vertex_shader = vertexShader;
    this.fragment_shader = fragmentShader;
    this.program = this.gl.createProgram();
    this.init_program();
    this.camera = new Camera([0, 0, 0], [0, 1, 0]);
    this.init_matrices();
    this.prop_sim = new PropSimulator();
    this.input_handler = new InputHandler(this);
    this.canvas.addEventListener("mousemove", (e) =>
      this.input_handler.onMouseMove(e),
    );
    this.mesh_rot = [0, 0, 0];
    this.model_matrix = identitym4();
  }

  static line_indices(point_count) {
    return [...Array(point_count).keys()];
  }

  compile_shader(shader_type, shader_source) {
    const shader = this.gl.createShader(this.gl[shader_type]);
    this.gl.shaderSource(shader, shader_source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = `An error occurred compiling the shaders: ${this.gl.getShaderInfoLog(
        shader,
      )}`;
      console.error(error);
      alert(error);
      this.gl.deleteShader(shader);
      return;
    }

    return shader;
  }

  init_program() {
    const vertexShader = this.compile_shader(
      "VERTEX_SHADER",
      this.vertex_shader,
    );
    const fragmentShader = this.compile_shader(
      "FRAGMENT_SHADER",
      this.fragment_shader,
    );
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      const error = `Unable to initialize the shader program: ${this.gl.getProgramInfoLog(
        this.program,
      )}`;
      console.error(error);
      alert(error);
      return;
    }

    this.gl.useProgram(this.program);
  }

  init_matrices() {
    this.projection_matrix = mat4.create();
    mat4.perspective(
      this.projection_matrix,
      glMatrix.toRadian(120),
      1,
      0.1,
      200.0,
    );
  }

  populate_buffer(buffer, buffer_type, size, data, mode = "STATIC_DRAW") {
    const type = this.gl[buffer_type];
    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, new size(data), this.gl[mode]);
  }

  set_vertices(vertices) {
    this.populate_buffer(
      this.vertex_buffer,
      "ARRAY_BUFFER",
      Float32Array,
      vertices,
    );
  }

  set_indices(indices) {
    this.populate_buffer(
      this.index_buffer,
      "ELEMENT_ARRAY_BUFFER",
      Uint16Array,
      indices,
    );
  }

  set_matrices(mesh = null) {
    const mvlocation = this.gl.getUniformLocation(this.program, "model_view");
    let mv = identitym4();
    const model = mesh ? this.model_matrix : I;
    mat4.multiply(mv, this.camera.get_view_matrix(), model);
    this.gl.uniformMatrix4fv(mvlocation, false, mv);
    const plocation = this.gl.getUniformLocation(this.program, "projection");
    this.gl.uniformMatrix4fv(plocation, false, this.projection_matrix);
  }

  set_color(color) {
    this.gl.uniform4fv(
      this.gl.getUniformLocation(this.program, "color"),
      new Float32Array(color),
    );
  }

  rotate_mesh(angle, axis) {
    const r_idx = axis.indexOf(1);
    this.mesh_rot[r_idx] += angle;
    mat4.rotate(this.model_matrix, this.model_matrix, angle, axis);
  }

  scale_mesh(factor) {
    mat4.scale(this.model_matrix, this.model_matrix, [factor, factor, factor]);
  }

  translate_mesh(tvec) {
    this.mesh.pos = math.add(this.mesh.pos, tvec);
    mat4.translate(this.model_matrix, this.model_matrix, tvec);
  }

  render(mode, elements, color, mesh = null) {
    const vbuffer = mesh ? mesh.vbo : this.vertex_buffer;
    const ibuffer = mesh ? mesh.ebo : this.index_buffer;
    const pa_loc = this.gl.getAttribLocation(this.program, "vertex_position");
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbuffer);
    this.gl.enableVertexAttribArray(pa_loc);
    this.gl.vertexAttribPointer(
      pa_loc,
      3,
      this.gl.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0,
    );

    this.set_matrices(mesh);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, ibuffer);
    this.set_color(color);
    this.gl.drawElements(mode, elements, this.gl.UNSIGNED_SHORT, 0);
  }

  draw_points(points, color = [0.8, 0.8, 0.8, 1.0], size) {
    this.set_vertices(points.flat());
    this.render(this.gl.POINTS, points.length, color);
  }

  draw_lines(points, color = [0.8, 0.8, 0.8, 0.5]) {
    this.set_vertices(points.flat());
    this.set_indices(webglController.line_indices(points.length));
    this.render(this.gl.LINES, points.length, color);
  }

  load_obj() {
    const verts = new Float32Array(this.model.vertices.flat());
    const idx = new Uint16Array(this.model.indices.flat().map((i) => i - 1));

    this.mesh = {
      vbo: this.gl.createBuffer(),
      ebo: this.gl.createBuffer(),
      count: idx.length,
      pos: math.matrix([0, 0, 0]),
    };

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mesh.vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, verts, this.gl.STATIC_DRAW);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.mesh.ebo);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, idx, this.gl.STATIC_DRAW);
  }

  draw_obj(color = [1.0, 0.4118, 0.7059, 0.25]) {
    this.render(this.gl.TRIANGLES, this.mesh.count, color, this.mesh);
  }

  draw_rect(top, i, j, w, h, color = [0, 0, 0, 0.3]) {
    const nj = math.multiply(j, -1);
    const a = math.add(top, math.multiply(i, w));
    const b = math.add(top, math.multiply(nj, h));
    const c = math.add(
      top,
      math.add(math.multiply(i, w), math.multiply(nj, h)),
    );
    const vertices = [top, a.toArray(), b.toArray(), c.toArray()];
    const indices = [0, 1, 2, 1, 2, 3];
    this.set_vertices(vertices.flat());
    this.set_indices(indices);
    this.render(this.gl.TRIANGLES, indices.length, color);
  }

  async init_loop() {
    this.model = await load_mesh(modelURL);
    this.model = parser.parse(this.model).at(0);
    this.model.indices = this.model.indices.map((i) => i + 1);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendEquation(this.gl.FUNC_ADD);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.depthFunc(this.gl.LEQUAL);

    // forbidden
    //this.gl.enable(this.gl.CULL_FACE);
    //this.gl.cullFace(this.gl.BACK);

    this.load_obj();

  }

  draw_axes() {
    this.draw_lines(
      [
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 2.0],
      ],
      [1.0, 0.0, 0.0, 1.0],
    );
    this.draw_lines(
      [
        [0.0, 0.0, 0.0],
        [0.0, 2.0, 0.0],
      ],
      [0.0, 1.0, 0.0, 1.0],
    );
    this.draw_lines(
      [
        [0.0, 0.0, 0.0],
        [2.0, 0.0, 0.0],
      ],
      [0.0, 0.0, 1.0, 1.0],
    );
  }

  mainloop() {
    // Do stuff
    this.draw_axes();
    this.prop_sim.draw_this(this);
    this.prop_sim.get_prop_perspective();
    this.prop_sim.draw_projection_lines(this);
    this.prop_sim.draw_projection_points(this);
    this.draw_obj();
    window.requestAnimationFrame(() => this.mainloop());
  }
}

async function main() {
  const canvas = document.getElementById("3Dprojective");
  const ctl = new webglController(canvas);
  await ctl.init_loop();
  while (ctl.model === undefined) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  ctl.camera.translate([2.5, 2.5, 2.1]);
  ctl.translate_mesh([0, 0, 12]);
  ctl.camera.look_direction = math.matrix([0, 0, 4])
  ctl.scale_mesh(1);
  ctl.mainloop();
}

main();
