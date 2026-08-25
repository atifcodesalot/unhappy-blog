

const toFloatArr = (prefix, line) => line
  .replace(prefix, '').trim().split(' ').map(parseFloat)

const join = (targetArr, arr) => {
  for (let i = 0; i < arr.length; i++) {
    targetArr[targetArr.length] = arr[i]
  }
}

export class ObjParser {
  parse (str) {
    const uncommentedStr = str.replace(/#(.)+\n/g, '')
    const segments = uncommentedStr.split(/o\n/).filter(s => !!s)

    const models = []
    segments.forEach(segment => {
      const lines = segment.split('\n').filter(line => line && line[0] !== '#')
      const model = {
        vertices: [],
        texCoords: [],
        normals: [],
        indices: []
      }
      lines.forEach(line => {
        const actionMapping = {
          'v ': line => {
            const arr = toFloatArr('v ', line)
            join(model.vertices, arr)
          },
          'vt': line => {
            const arr = toFloatArr('vt', line)
            join(model.texCoords, arr)
          },
          'vn': line => {
            const arr = toFloatArr('vn', line)
            join(model.normals, arr)
          },
          'f ': line => {
            const group = line
              .replace('f ', '')
              .split(' ')
              // OBJ face index starts from 1
              .map(abc => parseInt(abc.split('/')[0] - 1))
            join(model.indices, group)
          }
        }
        const key = line.substr(0, 2)
        if (!actionMapping[key]) return
        actionMapping[key](line)
      })
      models.push(model)
    })
    return models
  }
}
