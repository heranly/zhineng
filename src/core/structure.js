const path = require('path');
const fs = require('fs');
const { escapexml } = require('./util');
const metascraper = require('metascraper')([
    require('metascraper-author')(),
    require('metascraper-date')(),
    require('metascraper-description')(),
    require('metascraper-publisher')(),
    require('metascraper-title')(),
    require('metascraper-url')()
])
class WEBElement {
    constructor(config, level) {
        Object.assign(this, config);
        this.children = []
        this.level = level;
    }

    addChild(child) {
        this.children.push(child);
        child.parent = this;
    }

    findParentTarget(condition, target){
        if(condition(this, target)) return this;
        if(this.parent)
            return this.parent.findParentTarget(condition, target);
        return null;
    }

    findTarget(condition, target, layerTarget){
        if(condition(this, target)){
            return this;
        }
        let l = this.children.length - 1;
        while (l >= 0) {
            const elem = this.children[l];
            const t = elem.findTarget(condition, target, layerTarget);
            if(t) return t;
            l--;
        }
        return null;
    }

    findAllTargets(targetsMapping, conditions){
        conditions.forEach(c => {
            c(targetsMapping, this);
        });

        let l = this.children.length - 1;
        while (l >= 0) {
            const elem = this.children[l];
            elem.findAllTargets(targetsMapping, conditions);
            l--;
        }
    }

    findTargets(targets, condition){
        if(condition(this)){
            targets.push(this);
        }

        let l = this.children.length - 1;
        while (l >= 0) {
            const elem = this.children[l];
            elem.findTargets(targets, condition);
            l--;
        }
    }

    getCenter(){
        return {
            x: this.x + this.width/2,
            y: this.y + this.height / 2,
        }
    }

    toPlainObject(){
        const t = {};
        ['x', 'y', 'width', 'height', 'tagName', 'content', 'elementType', 'elementValue', 'level', 'id', 'class'].forEach((k) => {
            t[k] = this[k];
        });
        return t;
    }

    toJSONOBJ(){
        const ch = this.children.map((c) => c.toJSONOBJ()).filter(i => !!i);
        return {
            ...this.toPlainObject(),
            children: ch
        }
    }

    toTag() {
        let t = '';

        ['x', 'y', 'width', 'height', 'tagName', 'content', 'elementType', 'elementValue', 'id', 'class'].forEach((k) => {
            if (k === 'id') {
                t += ` elementId="${this[k]}"`;
                return;
            }
            if (k === 'content') {
                t += ` content="${escapexml(this[k])}"`;
                return;
            }
            if (k === 'width' || k === 'height') {
                if (this[k])
                    t += ` ${k}="${this[k]}"`;

                return;
            }
            if (this[k] || this[k] === 0)
                t += ` ${k}="${this[k]}"`;
        });
        if (this.url) {
            t += ` currentUrl="${escapexml(this.url)}"`;
        }
        return t;
    }
    toSlimTag() {
        let t = '';

        ['x', 'y', 'width', 'height', 'tagName', 'content', 'elementType', 'elementValue', 'id', 'class', 'depth'].forEach((k) => {
            if (k === 'id') {
                t += ` elementId="${this[k]}"`;
                return;
            }
            if (k === 'content') {
                t += ` content="${escapexml(this[k])}"`;
                return;
            }
            if (k === 'width' || k === 'height') {
                if (this[k])
                    t += ` ${k}="${this[k]}"`;

                return;
            }
            if (this[k] || this[k] === 0)
                t += ` ${k}="${this[k]}"`;
        });
        if (this.url) {
            t += ` currentUrl="${escapexml(this.url)}"`;
        }
        return t;
    }
    indent(i) {
        return new Array(i).fill(' ').join('');
    }
    toXML(i) {
        const ch = this.children.reduce((a, c) => a + c.toXML(i + 2), '');
        return `${this.indent(i)}<WEBElement ${this.toTag()}>\n${ch}\n${this.indent(i)}</WEBElement>\n`;
    }
    toSlimXML(i) {
        const ch = this.children.reduce((a, c) => a + c.toSlimXML(i + 2), '');
        return `${this.indent(i)}<WEBElement ${this.toSlimTag()}>\n${ch}\n${this.indent(i)}</WEBElement>\n`;
    }
}    

function walkNodes(root, level = 0){
    const elem = new WEBElement(root, level);
    root.children.forEach(child => {
        elem.addChild(walkNodes(child, level+1))
    });
    return elem;
} 
module.exports = async function(drive, tags, onlyjson){
    const script = fs.readFileSync(path.resolve(__dirname, './extractCore.js'), {
        encoding: 'utf-8'
    });
    const result = await drive.executeScript((script, tags, onlyjson) => {
        eval(script); 
        if(tags) 
            return extractCoreDomWithTagForDriver(tags, onlyjson);
        return extractCoreDomForDriver(onlyjson);
    }, script, tags, onlyjson)
    const html = await drive.getPageSource();
    const url = await drive.getCurrentUrl();
    const metadata = await metascraper({ html, url });
    const tree = JSON.parse(result.slimTreeJson);
    return {
        meta: metadata,
        tree: walkNodes(tree),
    }
}
