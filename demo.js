Array.prototype.myfilter = function(callback) {
    const input = this;
    const output = [];
    for (let a of input) {
        if (callback(a)) output.push(a);
    }
    return output;
}

const a = [1,2,3,4,5,6];
const filter = a.filter(e => e % 2);
const filter2 = a.myfilter(e => e % 2);
console.log(filter);
console.log(filter2);