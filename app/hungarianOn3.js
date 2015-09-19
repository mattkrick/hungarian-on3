var BitSet = require('fast-bitset');

/**
 * Solves the assignment problem (optimal matching for a directed bipartite graph)
 * @param {Array} costMatrix an array of arrays where a[n][m] is the cost of assigning job m to worker n
 * @param {boolean} [isProfit] solves the AP by maximizing the costs
 * @returns {Array} An array of arrays. a[0] = worker index. a[1] = job index (or -1 if unassigned)
 */
module.exports = function (costMatrix, isProfit) {
  costMatrix = clone2d(costMatrix);
  var ap = new AP(costMatrix, isProfit);
  if (ap.rows === 0 || ap.cols === 0) {
    return [];
  }
  return ap.execute();
};

function AP(costMatrix, isProfit) {
  this.BIG_M = Math.pow(2, 30);
  this.costMatrix = costMatrix;
  this.reduceSearchSpaceRows();
  this.rows = this.costMatrix.length;
  this.cols = this.rows === 0 ? 0 : this.costMatrix[0].length;
  if (isProfit) {
    this.makeItProfit();
  }
  this.makeSquare();
  var dim = this.costMatrix.length;
  this.dim = dim;
  this.labelByWorker = filledArray(dim, 0);
  this.labelByJob = filledArray(dim, this.BIG_M);
  this.minSlackWorkerByJob = new Array(dim);
  this.minSlackValueByJob = new Array(dim);
  this.committedWorkers = new BitSet(dim);
  this.jobByWorkerBS = new BitSet(dim);
  this.workerByJobBS = new BitSet(dim);
  this.parentWorkerByCommittedJob = new Array(dim);
  this.matchJobByWorker = filledArray(dim, -1);
  this.matchWorkerByJob = filledArray(dim, -1);
}

AP.prototype.computeInitialFeasibleSolution = function () {
  var j, w;
  //if (this.cols > this.rows) {
  //  fillArray(this.labelByJob, 0);
  //  return;
  //}
  for (w = 0; w < this.dim; w++) {
    for (j = 0; j < this.dim; j++) {
      if (this.costMatrix[w][j] < this.labelByJob[j]) {
        this.labelByJob[j] = this.costMatrix[w][j]
      }
    }
  }
};

AP.prototype.execute = function () {
  this.reduceRows();
  this.reduceCols();
  this.computeInitialFeasibleSolution();
  this.greedyMatch();
  var w = this.jobByWorkerBS.ffz();
  while (w !== -1) {
    this.initializePhase(w);
    this.executePhase();
    w = this.jobByWorkerBS.ffz();
  }
  return this.getResult()
};

AP.prototype.getResult = function () {
  var w, result;
  var arrRes = [];
  var paddedResults = filledArray(this.inflatedRows, -1);
  result = this.matchJobByWorker.slice(0, this.rows);

  for (w = 0; w < result.length; w++) {
    if (result[w] >= this.cols) {
      result[w] = -1;
    }
  }
  for (w = 0; w < this.rowsKept.length; w++) {
    paddedResults[this.rowsKept[w]] = result[w];
  }

  for (w = 0; w < paddedResults.length; w++) {
    arrRes[w] = [w, paddedResults[w]];
  }
  return arrRes;
};

AP.prototype.initializePhase = function (w) {
  var j, workerCost;
  fillArray(this.parentWorkerByCommittedJob, -1);
  this.committedWorkers.clear();
  this.committedWorkers.set(w);
  workerCost = this.costMatrix[w];
  for (j = 0; j < this.dim; j++) {
    if (!workerCost) debugger;
    this.minSlackValueByJob[j] = workerCost[j] - this.labelByWorker[w] - this.labelByJob[j];
    this.minSlackWorkerByJob[j] = w;
  }
};

AP.prototype.executePhase = function () {
  var committedJob, temp = 0, parentWorker, worker, mins;
  while (true) {
    mins = this.getMinSlack();
    if (mins.minSlackValue > 0) {
      this.updateLabeling(mins.minSlackValue);
    }
    this.parentWorkerByCommittedJob[mins.minSlackJob] = mins.minSlackWorker;
    if (!this.workerByJobBS.get(mins.minSlackJob)) {
      committedJob = mins.minSlackJob;
      parentWorker = this.parentWorkerByCommittedJob[committedJob];
      while (true) {
        temp = this.matchJobByWorker[parentWorker];
        this.match(parentWorker, committedJob);
        committedJob = temp;
        if (committedJob === -1) {
          break;
        }
        parentWorker = this.parentWorkerByCommittedJob[committedJob];
      }
      return;
    } else {
      worker = this.matchWorkerByJob[mins.minSlackJob];
      this.committedWorkers.set(worker);
      this.updateSlack(worker);
    }
  }
};

AP.prototype.updateSlack = function (worker) {
  for (j = 0; j < this.dim; j++) {
    if (this.parentWorkerByCommittedJob[j] === -1) {
      if (this.costMatrix[worker] === undefined) debugger; //TODO: caught this once, can't get it to repeat, possible bug
      var slack = this.costMatrix[worker][j] - this.labelByWorker[worker] - this.labelByJob[j];
      if (this.minSlackValueByJob[j] > slack) {
        this.minSlackValueByJob[j] = slack;
        this.minSlackWorkerByJob[j] = worker;
      }
    }
  }
};

AP.prototype.getMinSlack = function () {
  var minSlackWorker = -1;
  var minSlackJob = -1;
  var minSlackValue = Infinity;
  var j;
  for (j = 0; j < this.dim; j++) {
    if (this.parentWorkerByCommittedJob[j] === -1) {
      if (this.minSlackValueByJob[j] < minSlackValue) {
        minSlackValue = this.minSlackValueByJob[j];
        minSlackWorker = this.minSlackWorkerByJob[j];
        minSlackJob = j;
        if (minSlackValue === 0) break;
      }
    }
  }
  return {
    minSlackWorker: minSlackWorker,
    minSlackJob: minSlackJob,
    minSlackValue: minSlackValue
  }
};

AP.prototype.greedyMatch = function () {
  var i, j;
  for (i = 0; i < this.dim; i++) {
    for (j = 0; j < this.dim; j++) {
      if (!this.jobByWorkerBS.get(i) && !this.workerByJobBS.get(j) && this.costMatrix[i][j] === 0) {
        this.match(i, j);
        break;
      }
    }
  }
};

AP.prototype.match = function (i, j) {
  this.matchJobByWorker[i] = j;
  this.matchWorkerByJob[j] = i;
  this.jobByWorkerBS.set(i);
  this.workerByJobBS.set(j);
};

AP.prototype.reduceRows = function () {
  var minVal, i, j, costRow;
  for (i = 0; i < this.rows; i++) {
    costRow = this.costMatrix[i];
    minVal = costRow[0];
    for (j = 1; j < this.cols; j++) {
      if (costRow[j] < minVal) {
        minVal = costRow[j];
      }
    }
    for (j = 0; j < this.cols; j++) {
      costRow[j] -= minVal;
    }
  }
};

AP.prototype.reduceCols = function () {
  var costRow, i, j, minVals;
  minVals = filledArray(this.dim, Infinity);

  for (i = 0; i < this.dim; i++) {
    costRow = this.costMatrix[i];
    for (j = 0; j < this.cols; j++) {
      if (costRow[j] < minVals[j]) {
        minVals[j] = costRow[j];
      }
    }
  }
  for (i = 0; i < this.dim; i++) {
    for (j = 0; j < this.cols; j++) {
      this.costMatrix[i][j] -= minVals[j];
    }
  }
};

AP.prototype.updateLabeling = function (slack) {
  var j, w;
  for (w = 0; w < this.dim; w++) {
    if (this.committedWorkers.get(w)) {
      this.labelByWorker[w] += slack;
    }
  }
  for (j = 0; j < this.dim; j++) {
    if (this.parentWorkerByCommittedJob[j] !== -1) {
      this.labelByJob[j] -= slack;
    } else {
      this.minSlackValueByJob[j] -= slack;
    }
  }
};

function filledArray(len, fill) {
  var i, newArray = [];
  for (i = 0; i < len; i++) {
    newArray[i] = fill;
  }
  return newArray;
}

function fillArray(arr, fill) {
  var i;
  for (i = 0; i < arr.length; i++) {
    arr[i] = fill;
  }
}

function clone2d(mat) {
  var i, copy = [];
  for (i = 0; i < mat.length; i++) {
    copy[i] = mat[i].slice();
  }
  return copy;
}

AP.prototype.makeSquare = function () {
  var i, j, row;
  if (this.rows === this.cols) return;

  if (this.rows > this.cols) {
    for (i = 0; i < this.rows; i++) {
      row = this.costMatrix[i];
      for (j = this.cols; j < this.rows; j++) {
        row[j] = 0;
      }
    }
  } else if (this.rows < this.cols) {
    for (i = this.rows; i < this.cols; i++) {
      row = this.costMatrix[i] = [];
      for (j = 0; j < this.cols; j++) {
        row[j] = 0;
      }
    }
  }
};

AP.prototype.reduceSearchSpaceRows = function () {
  //remove rows where every value is equal to BIG_M, meaning nothing is feasible
  this.rowsKept = [];
  this.inflatedRows = this.costMatrix.length;
  for (var i = 0; i < this.costMatrix.length; i++) {
    var row = this.costMatrix[i];
    var impossible = true;
    for (var j = 0; j < row.length; j++) {
      var val = row[j];
      if (val < this.BIG_M) {
        impossible = false;
        break;
      }
    }
    if (impossible === true) {
      this.costMatrix[i] = undefined;
    } else {
      this.rowsKept.push(i);
    }
  }
  this.costMatrix = this.removeUndefinedFromArr();
};

AP.prototype.removeUndefinedFromArr = function () {
  var newArr = [];
  var val;
  for (var i = 0; i < this.costMatrix.length; i++) {
    val = this.costMatrix[i];
    if (val !== undefined) {
      newArr.push(val);
    }
  }
  return newArr;
};

AP.prototype.makeItProfit = function () {
  var biggestVal = 0;
  for (var i = 0; i < this.costMatrix.length; i++) {
    var row = this.costMatrix[i];
    for (var j = 0; j < row.length; j++) {
      var val = row[j];
      if (val > biggestVal && val < this.BIG_M) {
        biggestVal = val;
      }
    }
  }
  for (i = 0; i < this.costMatrix.length; i++) {
    row = this.costMatrix[i];
    for (j = 0; j < row.length; j++) {
      row[j] = (row[j] === 0) ? this.BIG_M : row[j] - biggestVal;
    }
  }
};
