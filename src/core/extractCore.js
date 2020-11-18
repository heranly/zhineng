class WEBElement {
    constructor({
        x, y, width, height, tagName, url, events, nodeType, content, elementType, elementValue, id, classobj, xpath, depth,
        scrollable,
        parentWebElement,
        overlayer,
        scrollHeight,
        scrollWidth,
        isOutOfLayout
    }) {
        this.id = id || '';
        this.class = classobj;

        this.nodeType = nodeType;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.tagName = tagName;
        this.content = content || '';
        this.xpath = xpath;
        this.scrollable = scrollable;
        this.scrollWidth = scrollWidth;
        this.scrollHeight = scrollHeight;
        this.isOutOfLayout = isOutOfLayout;
        // input type and value
        this.elementType = elementType;
        this.elementValue = elementValue;
        this.parentWebElement = parentWebElement;
        this.scrollTarget = this.getScrollTraget();
        this.overlayer = overlayer;
        this.overLayerTarget = null;
        this.url = url;
        if(depth){
            this.depth = depth;
        }

        this.children = [];
    }
    addChild(child) {
        this.children.push(child);
    }

    getIdentity() {
        return (this.id && `#${this.id}`)
            || (this.class && `.${this.class.split(' ').map((s) => s.trim()).join('.')}`)
            || this.tagName.toLowerCase();
    }

    genScrollTarget() {
        if (this.parentWebElement) {
            const preElement = this.parentWebElement.genScrollTarget();
            const preContext = preElement ? `${preElement} > ` : '';
            return `${preContext}${this.parentWebElement.getIdentity()}${this.parentWebElement.tagName === 'IFRAME' ? ' | ' : ''}`;
        }

        return null;
    }

    getScrollTraget() {
        if (!this.parentWebElement) {
            return 'window';
        }
        if (this.parentWebElement.scrollable && (this.parentWebElement.isOutOfLayout || (this.parentWebElement.scrollHeight > this.parentWebElement.height || this.parentWebElement.scrollWidth > this.parentWebElement.width))) {
            return this.genScrollTarget();
        } else {
            return this.parentWebElement.scrollTarget;
        }
    }

    isInSight(innerWidth, innerHeight) {
        return this.y <= innerHeight
                && this.x <= innerWidth
                && (this.y + this.height) >= 0
                && (this.x + this.width) >= 0;
    }

    isInOwnBound(x, y){
        return this.y <= y
                && this.x <= x
                && (this.y + this.height) >= y
                && (this.x + this.width) >= x;
    }

    targetIsInBound(x, y, targets, outoflayers){
        if(this.isInOwnBound(x, y)){
            if(this.content){
                // 有时候外层元素就具有了内容 也许是插件赋予
                targets.push(this);
            } else {
                if(this.children.length ){
                    this.children.forEach(child => {
                        child.targetIsInBound(x, y, targets);
                    });
                }else{
                    targets.push(this);
                }
            }
            
        }
    }

    toTag() {
        let t = '';

        ['x', 'y', 'width', 'height', 'tagName', 'content', 'elementType', 'elementValue', 'id', 'class', 'scrollTarget', 'overlayer', 'overLayerTarget'].forEach((k) => {
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

    toPlainObject(){
        const t = {};
        ['x', 'y', 'width', 'height', 'tagName', 'content', 'elementType', 'elementValue', 'id', 'class', 'scrollHeight', 'scrollWidth', 'overlayer', 'overLayerTarget'].forEach((k) => {
            t[k] = this[k];
        });
        if(this.url) {
            t.url = this.url;
        }
        if(this.depth) {
            t.depth = this.depth;
        }
        return t;
    }

    indent(i) {
        return new Array(i).fill(' ').join('');
    }

    toJSONOBJ(i){
        const ch = this.children.map((c) => c.toJSONOBJ(i + 2)).filter(i => !!i);
        return {
            ...this.toPlainObject(),
            children: ch
        }
    }

    clone(){
        return new WEBElement(this);
    }
}
const uselessTagName = function (tagName) {
    return ['STYLE', 'SCRIPT'].indexOf(tagName.toUpperCase()) !== -1;
};
const uselessTagStyle = function (style) {
    return style.display === 'none' || style.visibility === 'hidden';
};
const hasElementChild = function (element) {
    return Array.prototype.find.call(element.childNodes, (node) => node.nodeType === Node.ELEMENT_NODE);
};
const isScrollable = function (computedStyle) {
    return computedStyle.overflow !== 'hidden';
};
const isUselessElement = function (element, computedStyle) {
    const bounding = element.getBoundingClientRect();
    const plainEmpty = !hasElementChild(element) && (bounding.height === 0 || bounding.width === 0);
    return uselessTagName(element.tagName) || uselessTagStyle(computedStyle) || plainEmpty;
};

const isLiteralElementWithoutContent = function (element) {
    return ['DIV', 'SPAN'].includes(element.tagName.toUpperCase());
};

const isLiteralElement = function (element) {
    return (element.nodeType === Node.TEXT_NODE && element.nodeValue.trim() !== '')
            || (isLiteralElementWithoutContent(element));
};

const isClickableElement = function (element) {
    return !!element.click;
};

const isIframe = function (element) {
    return element.tagName.toUpperCase() === 'IFRAME';
};

const genWEBElement = function (node, parent, computedStyle) {
    let { x, y, width, height } = node.getBoundingClientRect();
    x = Math.round(x);
    y = Math.round(y);
    width = Math.round(width);
    height = Math.round(height);
    const embryo = {
        x, y, width, height,
        tagName: node.tagName,
        nodeType: node.nodeType,
        parentWebElement: parent,
        scrollHeight: node.scrollHeight,
        scrollWidth: node.scrollWidth
    };
    if (node.href) {
        embryo.url = node.href;
    }
    if (node.id)
        embryo.id = node.id;
    if (node.classList)
        embryo.classobj = Array.prototype.join.call(node.classList, ' ');

    embryo.scrollable = isScrollable(computedStyle);
    embryo.isOutOfLayout = !['static', 'relative'].includes(computedStyle.position)
    embryo.overlayer = computedStyle.position === 'fixed' && (width === window.innerWidth && height === window.innerHeight) 
    if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName.toUpperCase() === 'INPUT') {
            embryo.elementType = node.type.toUpperCase();
            embryo.elementValue = node.value;
        }
    }
    return new WEBElement(embryo);
};

const walkNode = function (node, genElement) {
    switch (node.nodeType) {
        case Node.ELEMENT_NODE:
            // to check if it is a container (a container need to contain an element with literal content directly);
            if (node.childNodes.length === 0)
                return;

                // let cache = genElement;
            let ixx = {};
            for (const child of node.childNodes) {
                
                // 避免同层改变 overLayerTarget
                // let overlayerTargetInLoop = overLayerTarget;

                const type = child.nodeType;
                if (type === Node.ELEMENT_NODE) {
                    const computedStyle = window.getComputedStyle(child);
                    if (isUselessElement(child, computedStyle)) {
                        continue;
                    }

                    const cache = genWEBElement(child, genElement, computedStyle);
                    cache.rawNode = child;
                    // console.log(child)
                    // if(cache.isOutOfLayout){
                    //     overlayerElems.push(cache);
                    // }
                    // if(overLayerTarget){
                    //     cache.overLayerTarget = overLayerTarget
                    // }

                    // if(cache.overlayer){
                    //     overlayerTargetInLoop = cache.getIdentity();
                    // }

                    genElement.addChild(cache);
                    // if (isIframe(child)) {
                    //     walkNode(child.contentDocument.body, cache, overlayerTargetInLoop, overlayerElems);
                    // }
                    walkNode(child, cache);
                }

                if (type === Node.TEXT_NODE) {
                    walkNode(child, genElement);
                }
            }
            break;
        case Node.TEXT_NODE:
            if (node.nodeValue.trim() !== '') {
                genElement.content = node.nodeValue;
            }

            break;
        default:

            break;
    }
};

function slimtree(t, slimt) {
    // depth = depth + 1;
    t.children.forEach(r => {
        let p = slimt;
        if(r.children.length !== 1) {
            p = r.clone();
            p.rawNode = r.rawNode;
            p.parentWebElement = slimt;
            slimt.addChild(p);
        }
        if(r.children.length > 0 ){
            slimtree(r, p);
        }
        if(r.children.length === 0 && r.content) {
            p.childContent = true;
            let q = p.parentWebElement;
            do{
                q.childContent = true;
                q = q.parentWebElement;
            }while(q && !q.childContent)
        }
    });
}

function shakeTreeWithTag(slimt, t, tags, depth = 0) {
    depth = depth + 1;
    slimt.children.forEach(r => {
        if(r.childContent) {
            let p = t;
            if(tags.includes(r.tagName)) {
                
                p = r.clone();
                p.depth = depth;
                p.rawNode = r.rawNode;
                if(r.tagName === 'P') {
                    p.content = p.rawNode.innerText;
                }
                t.addChild(p)
            }
            shakeTreeWithTag(r, p, tags, depth);
        }
    });
}

function shakeTree(slimt, t, depth = 0) {
    depth = depth + 1;
    slimt.children.forEach(r => {
        if(r.childContent) {
            const p = r.clone();
            p.depth = depth;
            p.rawNode = r.rawNode;
            t.addChild(p)
            shakeTree(r, p, depth);
        }
    });
}

const preorderTraversal = function(root) {
    let res = [];
    root.depth = 1;
    // 遍历函数
    function traversal(root) {
        if (root !== null) {
            // 访问根节点的值
            res.push({
                element: root.tagName,
                rawNode: root.rawNode,
                depth: root.depth,
            });
            for(let child of root.children) {
                traversal(child)
            }
        };
    };
        console.log(res)
    traversal(root);
    return res;
};

function generateDepthGraph(depth) {
    let container = document.getElementById('domextractorgraph')
    let graphContainer;
    if(!container) {
        container = document.createElement('div');
        container.setAttribute('style', 'position: fixed; bottom: 0; width: 100vw; height: 25vh; background: #fff;z-index:999999;')
        container.setAttribute('id', 'domextractorgraph')
        graphContainer = document.createElement('div');
        graphContainer.setAttribute('style', 'width: 100%; height: 100%;');
        container.appendChild(graphContainer);
        document.body.appendChild(container);
    } else {
        graphContainer = container.childNodes[0];
    }
    if(!window.echarts){
        window.define = undefined;
        window.exports = undefined;
        var script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/echarts@4.9.0/dist/echarts.min.js";
        document.body.appendChild(script);
        script.onload = (e) => {
            drawGraph(graphContainer, depth)
        }
    } else {
        drawGraph(graphContainer, depth)
    }
}
function drawGraph(container, depth) {
    const d = depth.map(d => d.depth);
    const e = depth.map(d => d.element);
    const n = depth.map(d => d.rawNode);
    console.log(d)
    const option = {
        xAxis: {
            type: 'category',
            data: e,
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            data: d,
            type: 'line',
            smooth: true
        }],
        grid: {
            top: 20,
            left: 60,
            right: 20,
            bottom: 50,
            backgroundColor: '#fff',
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                animation: false,
                label: {
                    backgroundColor: '#505765'
                }
            }
        },
        toolbox: {
            feature: {
                dataZoom: {
                    yAxisIndex: 'none'
                },
            }
        },
        dataZoom: [
            {
                show: true,
                realtime: true,
                start: 0,
                end: 100
            },
            {
                type: 'inside',
                realtime: true,
                start: 0,
                end: 100
            }
        ],
    };

    const chart = echarts.init(container);
    chart.setOption(option);
    chart.getZr().on('mousemove', (e) => {
        // console.log(e);
        const p = chart.convertFromPixel({ seriesIndex: 0 }, [e.offsetX, e.offsetY]);
        const idx = p[0];
        inspect(n[idx]);
    })
    chart.getZr().on('click', (e) => {
        // console.log(e);
        const p = chart.convertFromPixel({ seriesIndex: 0 }, [e.offsetX, e.offsetY]);
        const idx = p[0];
        n[idx].scrollIntoView();
        inspect(n[idx]);
        console.log(n[idx])
    })
}
let lastElement = document.createElement('div');
lastElement.setAttribute('style', 'position: fixed; background: rgba(52,108,240, 0.5);');
document.body.appendChild(lastElement);
function inspect(node) {
    let { x, y, width, height } = node.getBoundingClientRect();
    lastElement.style.left = `${x}px`;
    lastElement.style.top = `${y}px`;
    lastElement.style.width = `${width}px`;
    lastElement.style.height = `${height}px`;
}

function extractCoreDomForDriver(onlyjson){
    const tree = genWEBElement(document.body, null, window.getComputedStyle(document.body));
    tree.url = window.location.href;
    tree.width = window.innerWidth;
    tree.height = window.innerHeight;
    const overlayerElems = [];
    walkNode(document.body, tree);
    const tc = tree.clone();
    slimtree(tree, tc)
    const skt = tc.clone();
    shakeTree(tc, skt);
    if(!onlyjson) {
        generateDepthGraph(preorderTraversal(skt))
    }

    return {
        slimTreeJson:  JSON.stringify(skt.toJSONOBJ(0)),
    };
}

function extractCoreDomWithTagForDriver(tags = [], onlyjson) {
    const tree = genWEBElement(document.body, null, window.getComputedStyle(document.body));
    tree.url = window.location.href;
    tree.width = window.innerWidth;
    tree.height = window.innerHeight;
    const overlayerElems = [];
    walkNode(document.body, tree);
    const tc = tree.clone();
    slimtree(tree, tc)
    const skt = tc.clone();
    shakeTreeWithTag(tc, skt, tags, 0);
    const sskt = skt.clone();

    slimtree(skt, sskt);
    const ssskt = sskt.clone();
    shakeTree(sskt, ssskt)
    if(!onlyjson) {
        generateDepthGraph(preorderTraversal(ssskt))
    }
    
    return {
        slimTreeJson:  JSON.stringify(ssskt.toJSONOBJ(0)),
    };  
}