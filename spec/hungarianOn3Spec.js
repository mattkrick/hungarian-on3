describe("Hungarian", function () {
  var hungarian = require('../app/hungarianOn3.js');
  it('should return a 3x3', function () {
    var data = [[400, 150, 400],
      [400, 450, 600],
      [300, 225, 300]];
    var result = hungarian(data);
    var correctAnswer = [[0, 1], [1, 0], [2, 2]];
    expect(result).toEqual(correctAnswer);
  });

  it('should return a 4x3', function () {
    var data = [[400, 150, 400, 1],
      [400, 450, 600, 2],
      [300, 225, 300, 3]];
    var result = hungarian(data);
    var correctAnswer = [[0, 1], [1, 3], [2, 2]];
    expect(result).toEqual(correctAnswer);
  });

  it('should return a 3x3 of all 0s', function () {
    var data = [[0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]];
    var result = hungarian(data);
    var correctAnswer = [[0, 0], [1, 1], [2, 2]];
    expect(result).toEqual(correctAnswer);
  });

  it('should return an empty array if the input array is infeasible', function () {
    var BIG_M = Math.pow(2, 30);
    var data = [[BIG_M],
      [BIG_M+1],
      [BIG_M*300]];
    var result = hungarian(data);
    var correctAnswer = [];
    expect(result).toEqual(correctAnswer);
  });
});
