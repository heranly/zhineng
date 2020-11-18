// const str = 'body > #vue-iframe | > #app > ._3ZWWkJl1YH-NSJc9';
function resolveSelector(selector) {
    const parts = selector.split('|');
    const element = parts.reduce((accu, select, idx) => {
        if (idx !== 0)
            select = 'body ' + select;
        if (idx !== parts.length - 1) {
            return accu.querySelector(select).contentDocument;
        } else {
            return accu.querySelector(select);
        }
    }, document);
    return element;
}

function escapexml(str) {
    const rules = /[&'"><]/g;
    let newStr = '';
    let idx = 0;
    let rslt;
    while ((rslt = rules.exec(str)) !== null) {
        const matched = rslt[0];
        const index = rslt.index;
        // console.log(index);
        newStr += str.substring(idx, index);
        // console.log(newStr);
        idx = index + 1;
        switch (matched) {
            case '<':
                newStr += '&#60;';
                // str.splice(index, '&#60;', 1);
                break;
            case '>':
                newStr += '&#62;';
                // str.splice(index, '&#62;', 1);
                break;
            case '"':
                newStr += '&#34;';
                // str.splice(index, '&#34;', 1);
                break;
            case '\'':
                newStr += '&#39;';
                // str.splice(index, '&#39;', 1);
                break;
            case '&':
                newStr += '&#38;';
                // str.splice(index, '&#38;', 1);
                break;
            default:
                break;
        }
    }
    newStr += str.substring(idx, str.length);
    return newStr;
}

module.exports = {
    resolveSelector,
    escapexml
};
