// @ts-nocheck

// Helpers
Element.prototype.setText = function (str) {
    this.textContent = str;
}

Element.prototype.setHTML = function(HTML) {
    if (typeof HTML == 'string') {
        let tempWrap = document.createElement('div');
        tempWrap.innerHTML = HTML;
        HTML = tempWrap.innerHTML;
    }
    this.innerHTML = HTML;
}

/**
 * 
 * @param {string} selector 
 * @returns {Element}
 */
// @ts-ignore
const qs = (selector) => document.querySelector(selector);

/**
 * 
 * @param {string} selector 
 * @returns {NodeListOf<Element>}
 */
const qsAll = (selector) => document.querySelectorAll(selector);

// Paper.js Implementation
import * as paper from 'paper';
paper.install(window);
paper.setup(qs('#canvas'));
const canvas = paper;
global.canvas = canvas;

import Hammer from 'hammerjs';
import randomColor from 'randomcolor';

const canvasElement = qs('#canvas');

//
//
// SECTION 1
// Views, movement, zoom, alignment, etc.
//
//

canvasElement.addEventListener('mousewheel', (e) => {
    let newZoom = paper.view.zoom; 
    let oldZoom = paper.view.zoom;
    
    let factor = e.deltaY < 0 ? 1.05 : 0.95;
    newZoom = paper.view.zoom * factor;
    
    let beta = oldZoom / newZoom;
    
    var mousePosition = new Point(e.offsetX, e.offsetY);
    
    //viewToProject: gives the coordinates in the Project space from the Screen Coordinates
    var viewPosition = paper.view.viewToProject(mousePosition);
    
    var mpos = viewPosition;
    var ctr = paper.view.center;
    
    var pc = mpos.subtract(ctr);
    var offset = mpos.subtract(pc.multiply(beta)).subtract(ctr);	
    
    if (newZoom > 1) {
        qs('.zoom-control').value = 100;
        return
    }
    if (newZoom < 0.3) {
        qs('.zoom-control').value = 30;
        return
    }

    paper.view.zoom = newZoom;
    paper.view.center = paper.view.center.add(offset);
    
    e.preventDefault();	

    console.log(newZoom)
    qs('.zoom-control').value = Math.floor(newZoom * 100);
})

qs('.zoom-control').addEventListener('input', (e) => {
    let newZoom = (parseInt(e.target.value) / 100); 
    paper.view.zoom = newZoom;
    
    e.preventDefault();	
});

const clearPlayerTrails = () => {
    let trails = {};

    let canvasItems = canvas.project.activeLayer.children['globalPlayerGroup'].children;
    for (let i = canvasItems.length - 1; i >= 0; i--) {
        let item = canvasItems[i];
        if (item.className == 'Path') {
            trails.exist = true;
            item.tween({ opacity: 0 }, 200); 

            lastPlayer = null;
            lastPlayerLine = null;

            setTimeout(() => {
                for (let i = canvasItems.length - 1; i >= 0; i--) {
                    if (canvasItems[i].className == 'Path') {
                        canvasItems[i].remove();
                    }
                }
            }, 200); 
        }
    }

    let sorted = [...canvasItems].sort((a, b) => a.id - b.id);
    sorted.forEach((item, index) => {
        item.name = '';
    }); 

    return trails;
}
qs('.clear-trails').onclick = clearPlayerTrails;

var drawTrails = true;

const toggleTrails = (action) => {
    qs('.tr-label').setText(`Trails are ${action.toUpperCase()}`)

    if (action == 'on') {
        drawTrails = true;
        return;
    }
    drawTrails = false;
    clearPlayerTrails();
};
qs('#toggle-trails').onchange = () => {
    setTimeout(() => {
        let state = qs('#toggle-trails').checked ? 'on' : 'off';
        qs('.trails-toggle').dataset.state = state;
        toggleTrails(state);
    })
};

const alignCenter = (formationFunction, options) => {
    canvas.view.zoom = 1;

    qs('.zoom-control').value = 100;
    let canvasItems = canvas.project.activeLayer.children['globalPlayerGroup'].children;

    let otherGroups = canvas.project.activeLayer.children.filter(g => g.name != 'globalPlayerGroup');

    if (options.animatePosition == true) {
        let positions = formationFunction({ getPositionsOnly: true });
        console.log({positions});

        lastPlayer = null;
        lastPlayerLine = null;

        let trails = clearPlayerTrails();
        if (trails.exist) {
            setTimeout(() => {
                for (let i = canvasItems.length - 1; i >= 0; i--) {
                    if (canvasItems[i].className == 'Path') {
                        canvasItems[i].remove();
                    }
                }
    
                let sorted = [...canvasItems].sort((a, b) => a.id - b.id);
                sorted.forEach((item, index) => {
                    item.name = '';
                    item.tween({
                        position: {
                            x: positions[index].x,
                            y: positions[index].y,
                        }
                    }, {
                        easing: 'easeOutCubic',
                        duration: 900
                    });
                });
            }, 200);
        } else {
            let sorted = [...canvasItems].sort((a, b) => a.id - b.id);
            console.log('Sorted @157:', sorted)
            sorted.forEach((item, index) => {
                item.name = '';
                console.log('tweening to:', positions[index])
                item.tween({
                    position: {
                        x: positions[index].x,
                        y: positions[index].y,
                    }
                }, {
                    easing: 'easeOutCubic',
                    duration: 900
                });
            });
        }


        for (let o = otherGroups.length - 1; o >= 0; o--) {
            otherGroups[o].tween({ opacity: 0 }, 200); 
    
            setTimeout(() => {
                for (let o = otherGroups.length - 1; o >= 0; o--) {
                        otherGroups[o].remove();
                }
            }, 200); 
        }


        let centerCoords = {
            x: getFormationWidth() / 2,
            y: getFormationHeight() / 2
        };
        console.log({centerCoords});

        let tempX = paper.view.center.x;
        let tempY = paper.view.center.y;
        //paper.view.center = new Point(centerCoords.x, centerCoords.y);

        /*
        canvas.view.onFrame = (event) => {
            // the number of times the frame event was fired:
            console.log(event.count, 'Frames');
        
            // The total amount of time passed since
            // the first frame event in seconds:
            console.log(event.time.toFixed(3), 'Seconds');
        
            // The time passed in seconds since the last frame event:
            //console.log(event.delta);

            if (paper.view.center.x != centerCoords.x || paper.view.center.y != centerCoords.y) {
                console.log({
                    centerCoords,
                    current: {
                        x: paper.view.center.x,
                        y: paper.view.center.y
                    }
                })

                if (paper.view.center.x != centerCoords.x) {
                    paper.view.center = new Point(tempX, tempY);
                    
                    if (paper.view.center.x < centerCoords.x) {
                        tempX += 1;
                    } else {
                        tempX -= 1;
                    }

                    console.log('changing X', {
                        tempX,
                        tempY,
                    });
                }
                if (paper.view.center.y != centerCoords.y) {
                    paper.view.center = new Point(tempX, tempY);
                    
                    if (paper.view.center.y < centerCoords.y) {
                        tempY += 1;
                    } else {
                        tempY -= 1;
                    }

                    console.log('changing Y', {
                        tempX,
                        tempY,
                    });
                }


            } else {
                console.log((paper.view.center.x != centerCoords.x || paper.view.center.y != centerCoords.y));
                canvas.view.onFrame = (event) => {};
            }
        }
        */

        return;
    }

    for (let i = canvasItems.length - 1; i >= 0; i--) {
        canvasItems[i].remove();
    }

    formationFunction({ animate: options.animate });

}
global.alignCenter = alignCenter;

var pressedKeys = {};
window.onkeyup = function(e) { 
    pressedKeys[e.code] = false; 

    if (e.code == 'Space' && pressedKeys['mouse'] == false) {
        canvasElement.style.cursor = 'default';
    }
}
window.onkeydown = function(e) { 
    console.log(e);
    if (e.repeat) {
        return;
    }
    pressedKeys[e.code] = true; 

    if (e.code == 'Space') {
        canvasElement.style.cursor = 'grab';
    }

    if (e.code == 'Backspace') {
        if (arrowSelected) {
            console.log('deleted:', arrowSelected)
            arrowSelected.vItem.remove();
        }
    }
}
global.pressedKeys = pressedKeys;

var arrowTool = new Tool();

var control = new Hammer(canvasElement);
var tempHammerScale;
const pinchEndHandler = (e) => {
    tempHammerScale = null;
}
const pinchHandler = (e) => {
    if (!tempHammerScale) {
        return tempHammerScale = e.scale;
    }
    let newZoom = paper.view.zoom;

    if (e.additionalEvent == 'pinchstart') {
        alert('pinchstart');
    }
    if (e.additionalEvent == 'pinchin') {
        newZoom = paper.view.zoom + (e.scale - tempHammerScale);
    } else if (e.additionalEvent == 'pinchout') {
        newZoom = paper.view.zoom + (e.scale - tempHammerScale);
    }  


    if (newZoom > 1) {
        qs('.zoom-control').value = 100;
        return;
    }
    if (newZoom < 0.3) {
        qs('.zoom-control').value = 30;
        return;
    }

    paper.view.zoom = newZoom;

    qs('.zoom-control').value = Math.floor(newZoom * 100);
    tempHammerScale = e.scale;
}




//
//
// SECTION 2
// Tools, Drawing & Interaction
//
//

const onMouseDragDefaultHandler = function(event) {
    if (noAction) return console.warn('no action (mouseDragDefault)');
    if (!event.modifiers.shift && values.fixLength && values.fixAngle)
        vectorStart = event.point;

    processVector(event, event.modifiers.shift, false);
}

const arrowToolMouseUpHandler = function(event) {
    if (noAction) return console.warn('no action (mouseup)');

    if (adjustingFromBottom) {
        processVector(adjustingFromBottom, false);
        adjustingFromBottom = false;
    } else {
        processVector(event, false);
    }

    mouseIsUp = true;
    if (dashItem) {
        dashItem.dashArray = [1, 2];
        dashItem = null;
    }
    vectorPrevious = vector;

    console.log('MouseUp @ mouseUpHandler:', vector, vectorItem)

    if (Math.abs(vector.x) < 5 && Math.abs(vector.y) < 5) {
        console.warn('arrow too short. @mouseup');
        vectorItem.remove();
    }

    let startingArrowPoint = vectorItem.children[0].segments[0].point;
    let endingArrowPoint = vectorItem.children[0].segments[1].point;

    let controlHandleGroup = new Group(); 
    let cH1 = new Path.Circle(startingArrowPoint, 5);
    let cH2 = new Path.Circle(endingArrowPoint, 5);
    cH1.fillColor = 'rgba(189, 218, 226, 0.8)';
    cH2.fillColor = 'rgba(189, 218, 226, 0.8)';

    cH1.name = 'ch1'
    cH2.name = 'ch2'

    cH1.strokeColor = '#333';
    cH2.strokeColor = '#333';

    controlHandleGroup.addChild(cH1)
    controlHandleGroup.addChild(cH2)
    controlHandleGroup.opacity = 1;

    vectorItem.addChild(controlHandleGroup);

    vectorItem.onMouseEnter = (e) => {
        let handlesGroup = e.target.children[2];
        handlesGroup.opacity = 1;
        console.log('entered arrow:', vectorItem)
    }

    vectorItem.onMouseLeave = (e) => {
        let handlesGroup = e.target.children[2];
        handlesGroup.opacity = 0;
        console.log('left arrow:', vectorItem)
    }

    vectorItem.onClick = (e) => {
        selectVector(e.target)
    };

    selectVector(vectorItem)

    arrowTool.onMouseDrag = onMouseDragDefaultHandler;
};


const adjustVector = function(event, handle, currentLine) {
    console.log({currentLine})
    if (noAction) return console.warn('no action (mouseDragAdjust)');
    let mousePosition = new Point(event.event.clientX, event.event.clientY);

    if (handle.name == 'ch2') { // This is the point on the arrow head
        vectorStart = currentLine.children[0].segments[0].point;
        processVector(event, event.modifiers.shift, false)
    } else if (handle.name == 'ch1') {
        vectorStart = mousePosition;
        processVector(currentLine.children[0].segments[1], event.modifiers.shift, false)
        adjustingFromBottom = currentLine.children[0].segments[1];
    }
}

const isTouchDevice = (window.matchMedia("(pointer: coarse)").matches);

const panControl = (action, safePanning=false) => {
    global.isPanControlOn = action;
    if (action == 'off') {
        canvasElement.onmousedown = null;
        arrowTool.onMouseDown = null;
        arrowTool.onMouseUp = null;
        arrowTool.onMouseDrag = null;
        control.off('pinchend', pinchEndHandler);
        control.off('pinch', pinchHandler);
        canvasElement.ontouchstart = null;
        canvasElement.ontouchmove = null;
        return;
    }


    if (isTouchDevice) {
        control.get('pinch').set({ enable: true });

        control.on('pinchend', pinchEndHandler);
        control.on('pinch', pinchHandler);

        let tempTouchX;
        let tempTouchY;

        canvasElement.ontouchstart = (e) => {
            tempTouchX = e.touches[0].clientX;
            tempTouchY = e.touches[0].clientY;
        }

        canvasElement.ontouchmove = ((e) => {
            let deltaTouchX = e.touches[0].clientX - tempTouchX;
            let deltaTouchY = e.touches[0].clientY - tempTouchY;
            paper.view.center = paper.view.center.subtract(new paper.Point(deltaTouchX * (1 / canvas.view.zoom), deltaTouchY * (1 / canvas.view.zoom)));
            tempTouchX = e.touches[0].clientX;
            tempTouchY = e.touches[0].clientY;
        });

        return;
    }

    canvasElement.oncontextmenu = (e) => {
        console.log('rightclick')
        e.preventDefault();
    }

    arrowTool.onMouseUp = arrowToolMouseUpHandler;

    arrowTool.onMouseDown = function(event) {
        let e = event.event;
        if (pressedKeys['Space'] || e.button == 2) {
            noAction = true;
            pressedKeys['mouse'] = true;
            canvasElement.style.cursor = 'grabbing';

            canvasElement.onmousemove = (e) => {
                // Prevent user from panning further than at least one visible item
                let viewBounds = canvas.view.bounds;
                let layerBounds = canvas.project.activeLayer.bounds;
    
                if (safePanning == true) {
                    if (layerBounds.right > viewBounds.right && e.movementX > 0) {
                        return console.warn('Cannot pan further left');
                    }
                    if (layerBounds.left < viewBounds.left && e.movementX < 0) {
                        return console.warn('Cannot pan further right');
                    }
                    if (layerBounds.bottom > viewBounds.bottom && e.movementY > 0) {
                        return console.warn('Cannot pan further up');
                    }
                    if (layerBounds.top < viewBounds.top && e.movementY < 0) {
                        return console.warn('Cannot pan further down');
                    }
                }
    
                paper.view.center = paper.view.center.subtract(e.movementX * (1 / canvas.view.zoom), e.movementY * (1 / canvas.view.zoom));
                canvasElement.onmouseup = () => {
                    canvasElement.onmousemove = null;
                    canvasElement.onmouseup = null;
                    pressedKeys['mouse'] = false;
                    canvasElement.style.cursor = (pressedKeys['Space']) ? 'grab' : 'default';
                }
            };
        } else {
            if (arrowSelected) {
                //noAction = true;
                console.log(arrowSelected)
                arrowSelected.handlesGroup.opacity = 0;
    
                arrowSelected.vItem.onMouseEnter = (e) => {
                    let handlesGroup = e.target.children[2];
                    handlesGroup.opacity = 1;
                    console.log('entered arrow:', e.target)
                }
        
                arrowSelected.vItem.onMouseLeave = (e) => {
                    let handlesGroup = e.target.children[2];
                    handlesGroup.opacity = 0;
                    console.log('left arrow:', e.target)
                }
    
                arrowSelected = false;
            } 
            let hitOptions = {
                segments: true,
                stroke: true,
                fill: true,
                tolerance: 5
            };
    
            let hitResult = canvas.project.hitTest(new Point(e.clientX, e.clientY), hitOptions);
    
            if (hitResult) {
                console.log('HitResult:', hitResult);
                if (hitResult.item?.name && hitResult.item.name.includes('ch')) {
                    if (arrowSelected) {
                        arrowSelected.handlesGroup.opacity = 0;

                        arrowSelected.vItem.onMouseEnter = (e) => {
                            let handlesGroup = e.target.children[2];
                            handlesGroup.opacity = 1;
                            console.log('entered arrow:', e.target)
                        }
                
                        arrowSelected.vItem.onMouseLeave = (e) => {
                            let handlesGroup = e.target.children[2];
                            handlesGroup.opacity = 0;
                            console.log('left arrow:', e.target)
                        }
                    }
                    
                    noAction = false;
                    console.warn('CONTROL HANDLE TOUCHED:', hitResult.item.name);
                    vectorItem = event.item;
                    arrowTool.onMouseDrag = (e) => {
                        adjustVector(e, hitResult.item, event.item)
                    };
                    return;
                } 

                if (hitResult.type == 'stroke') {
                    console.warn('ARROW STROKE TOUCHED:', hitResult.item.parent);
                    arrowTool.onMouseDrag = (e) => {
                        console.log(e);
                        hitResult.item.parent.position = hitResult.item.parent.position.add(e.delta)
                    };
                    arrowTool.onMouseUp = () => {
                        arrowTool.onMouseUp = arrowToolMouseUpHandler;
                    };
                    return;
                }
                
                if (hitResult.type == 'segment') {
                    noAction = true;
                    hitResult.item.selected = true;

                    if (lastPlayerLine) {
                        lastPlayerLine.onMouseLeave = null;
                    }

                    canvasElement.onmousemove = (e) => {
                        hitResult.segment.point = hitResult.segment.point.add(new Point(e.movementX, e.movementY));
                        hitResult.item.smooth();
                        canvasElement.onmouseup = (e) => {
                            canvasElement.onmousemove = null;
                        };
                    };
                    return;
                } 
                if (hitResult.item.className == 'Path') {
                    return;
                }
            } else {
                noAction = true;
                canvas.project.activeLayer.selected = false;
                if (lastPlayerLine) {
                    lastPlayerLine.onMouseLeave = (e) => {
                        lastPlayerLine.selected = false;
                    };
                }
            }
        }
    }
}

var lastPlayer = null;
var lastPlayerLine = null;

const addPlayer = (options, scale) => {
    let path = `${options.path}.svg`;
    let player = new paper.Raster(path);
    player.scale(scale);
    player.opacity = 0;

    let group = canvas.project.activeLayer.children['globalPlayerGroup'];
    group.addChild(player);
    
    player.onMouseDown = (mouseDownEvent) => {
        if (qs('.current-mode').classList.contains('select-mode-wrapper')) {} else {
            return;
        }
        panControl('off')

        let startingPoint = player.position;
        
        document.body.classList.add('dragging');

        canvasElement.style.cursor = 'grabbing';

        player.bringToFront();


        if (window.matchMedia("(pointer: coarse)").matches) {
            canvasElement.ontouchmove = (e) => {
                console.log(e);
                var boundingRect = canvasElement.getBoundingClientRect();
                let firstTouch = e.changedTouches[0];

                if (firstTouch.clientY < (boundingRect.top + 35)) {
                    player.position.y = boundingRect.top - (scale * 70);       
                } else if (firstTouch.clientY > (boundingRect.bottom - 40)) {
                    player.position.y = boundingRect.bottom - (scale * 230);
                } else {
                    player.position.y = firstTouch.clientY - boundingRect.top;
                }

                if (firstTouch.clientX < (boundingRect.left + 25)) {
                    player.position.x = boundingRect.left + (scale * 55);
                } else if (firstTouch.clientX > (boundingRect.right - 25)) {
                    player.position.x = boundingRect.right - (scale * 55);
                } else {
                    player.position.x = firstTouch.clientX - boundingRect.left;
                }
            };
            canvasElement.ontouchend = () => {
                canvasElement.ontouchmove = null;
                canvasElement.ontouchend = null;
                canvasElement.style.cursor = 'grab';
            };
        } else {
            canvasElement.onmousemove = (e) => {
                player.position.x += (e.movementX * (1 / canvas.view.zoom));
                player.position.y += (e.movementY * (1 / canvas.view.zoom));
            };
        }

        // Touch out
        canvasElement.onmouseout = (e) => {
            canvasElement.style.cursor = 'grab';
            canvasElement.onmousemove = null;
            canvasElement.onmouseenter = (e) => {
                player.position.x = e.clientX;
                player.position.y = e.clientY;
                canvasElement.style.cursor = 'grabbing';
                canvasElement.onmousemove = (e) => {
                    player.position.x += (e.movementX * (1 / canvas.view.zoom));
                    player.position.y += (e.movementY * (1 / canvas.view.zoom));
                };
            };
        };
        canvasElement.onmouseup = (e) => {
            //console.log('diasdins')
            canvasElement.style.cursor = 'grab';
            canvasElement.onmousemove = null;
            canvasElement.onmouseout = null;
            canvasElement.onmouseup = null;

            setTimeout(() => {
                panControl('on');
            }, 1)

            document.body.classList.remove('dragging');

            let endingPoint = player.position;
            console.log('%ccanvasElement.onmouseup has fired', 'padding: 10px; font-style: italic')
            console.log({
                startingPoint,
                endingPoint
            });

            

            if (drawTrails == true) {
                if (lastPlayer && lastPlayer != player) {
                    let group = canvas.project.activeLayer.children['globalPlayerGroup'];
                    let playerHasLineId = group.children[player.name];

                    if (playerHasLineId) {
                        let lineId = player.name.replace('id-', '');
                        console.log('Found line id: ', lineId);
                        let line = group.children.find(c => c.id == lineId);
                        let latestSegment = line.add(endingPoint);
                        lastPlayerLine = line;
                        line.smooth({
                            type: 'continuous',
                            factor: 0.2
                        });
                        line.simplify({
                            tolerance: 1
                        });
                    } else {
                        console.log('No line id found, creating new line');
                        let line = new paper.Path.Line({
                            from: startingPoint,
                            to: endingPoint,
                            strokeColor: randomColor({
                                luminosity: 'dark',
                                hue: 'blue',
                                format: 'rgba',
                                alpha: 0.5
                            }),
                            strokeWidth: 2,
                            strokeCap: 'round',
                            strokeJoin: 'round'
                        });
                        line.insertBelow(player);
                        lastPlayerLine = line;

                        lastPlayerLine.onMouseEnter = (e) => {
                            lastPlayerLine.selected = true;
                        };
                        lastPlayerLine.onMouseLeave = (e) => {
                            lastPlayerLine.selected = false;
                        };
                        
                        player.name = 'id-' + line.id;
                    }
                } else if (lastPlayerLine) {
                    console.log('No last player (or same player), but last player line found: ', lastPlayerLine);
                    let added = lastPlayerLine.add(endingPoint);
                    lastPlayerLine.smooth({
                        type: 'continuous',
                        factor: 0.2
                    });
                    lastPlayerLine.simplify({
                        tolerance: 1
                    });

                    lastPlayerLine.onMouseEnter = (e) => {
                        lastPlayerLine.selected = true;
                    };
                    lastPlayerLine.onMouseLeave = (e) => {
                        lastPlayerLine.selected = false;
                    };
                } else {
                    console.log('No last player, no last player line found');
                    let line = new paper.Path.Line({
                        from: startingPoint,
                        to: endingPoint,
                        strokeColor: randomColor({
                            luminosity: 'dark',
                            hue: 'blue',
                            format: 'rgba',
                            alpha: 0.5
                        }),
                        strokeWidth: 2,
                        strokeCap: 'round',
                        strokeJoin: 'round'
                    });
                    line.insertBelow(player);
                    lastPlayerLine = line;
                    player.name = 'id-' + line.id;

                    lastPlayerLine.onMouseEnter = (e) => {
                        lastPlayerLine.selected = true;
                    };
                    lastPlayerLine.onMouseLeave = (e) => {
                        lastPlayerLine.selected = false;
                    };
                }

                return lastPlayer = player;
            }
            return;

            let distance = startingPoint.getDistance(endingPoint);
            console.log('Distance: ', distance);

            let box = new paper.Path.Rectangle(startingPoint, endingPoint);

            let h1 = box.bounds.topLeft;
            let h2 = box.bounds.bottomRight;

            if (direction == 'bottom-right') {
                h1 = h1.subtract(startingPoint).add(new Point(distance*0.35, distance*0.2));
                h2 = h2.subtract(endingPoint).add(new Point(distance*-0.1, distance*-0.15));
            } else if (direction == 'bottom-left') {
                h1 = h1.add(new Point(10, 10));
                h2 = h2.add(new Point(-13, -14));
            } else if (direction == 'top-right') {
                h1 = h1.add(new Point(10, 10));
                h2 = h2.add(new Point(-13, -14));
            } else if (direction == 'top-left') {
                h1 = h1.add(new Point(10, 10));
                h2 = h2.add(new Point(-13, -14));
            }

            console.log('Direction: ', direction);

            console.log(box);

            var c1 = new Path.Circle(h1.add(startingPoint), 3);
            var c2 = new Path.Circle(h2.add(endingPoint), 3);
            c1.fillColor = 'orange'
            c2.fillColor = 'red';

            let e1seg = new paper.Segment(startingPoint, null, h1);
            let e2seg = new paper.Segment(endingPoint, h2, null);
            let connector = new paper.Path(e1seg, e2seg);
            connector.strokeColor = 'black';
            console.log('End coordinate: ', player.position);
        };
    };
    player.onMouseEnter = () => {
        canvasElement.style.cursor = 'grab';
    };
    player.onMouseLeave = () => {
        canvasElement.style.cursor = 'default';
    };

    return player;
}

// Arrows


var values = {
	fixLength: false,
	fixAngle: false,
	showCircle: false,
	showAngleLength: false,
	showCoordinates: false
};

var vectorStart, vector, vectorPrevious;
var vectorItem, items, dashedItems;
var mouseIsUp = true;
var adjustingFromBottom;

function processVector(event, drag, isNew=false) {
	vector = event.point.subtract(vectorStart);
    console.log('calculated vector:', vector)

	if (vectorPrevious) {
		if (values.fixLength && values.fixAngle) {
			vector = vectorPrevious;
		} else if (values.fixLength) {
			vector.length = vectorPrevious.length;
		} else if (values.fixAngle) {
			vector = vector.project(vectorPrevious);
		}
	}
	drawVector(drag, isNew);
}

const selectVector = (vItem) => {
    if (arrowSelected) {
        arrowSelected.handlesGroup.opacity = 0;

        arrowSelected.vItem.onMouseEnter = (e) => {
            let handlesGroup = e.target.children[2];
            handlesGroup.opacity = 1;
            console.log('entered arrow:', e.target)
        }

        arrowSelected.vItem.onMouseLeave = (e) => {
            let handlesGroup = e.target.children[2];
            handlesGroup.opacity = 0;
            console.log('left arrow:', e.target)
        }
    }

    let handlesGroup = vItem.children[2];
    handlesGroup.opacity = 1;
    vItem.onMouseLeave = (e) => {}
    vItem.onMouseEnter = (e) => {}
    arrowSelected = {
        handlesGroup,
        vItem
    };
}

function drawVector(drag, isNew=false) {
	if (items) {
		for (var i = 0, l = items.length; i < l; i++) {
			//items[i].remove();
		}
	}
	if (vectorItem && isNew == false) {
        //console.log('REMOVING:', vectorItem.id)
		vectorItem.remove();
    }
	items = [];
	var arrowVector = vector.normalize(10);
	var end = vectorStart.add(vector);
	vectorItem = new Group([
		new Path([vectorStart, end]),
		new Path([
			end.add(arrowVector.rotate(135)),
			end,
			end.add(arrowVector.rotate(-135))
		])
	]);
	vectorItem.strokeWidth = 3;
	vectorItem.strokeColor = '#3f5358';
	// Display:
	dashedItems = [];
	// Draw Circle
	if (values.showCircle) {
		dashedItems.push(new Path.Circle({
			center: vectorStart,
			radius: vector.length
		}));
	}
	// Draw Labels
	if (values.showAngleLength) {
		drawAngle(vectorStart, vector, !drag);
		if (!drag)
			drawLength(vectorStart, end, vector.angle < 0 ? -1 : 1, true);
	}
	var quadrant = vector.quadrant;
	if (values.showCoordinates && !drag) {
		drawLength(vectorStart, vectorStart + [vector.x, 0],
				[1, 3].indexOf(quadrant) != -1 ? -1 : 1, true, vector.x, 'x: ');
		drawLength(vectorStart, vectorStart + [0, vector.y], 
				[1, 3].indexOf(quadrant) != -1 ? 1 : -1, true, vector.y, 'y: ');
	}
	for (var i = 0, l = dashedItems.length; i < l; i++) {
		var item = dashedItems[i];
		item.strokeColor = 'black';
		item.dashArray = [1, 2];
		items.push(item);
	}
	// Update palette
	values.x = vector.x;
	values.y = vector.y;
	values.length = vector.length;
	values.angle = vector.angle;
}

function drawAngle(center, vector, label) {
	var radius = 25, threshold = 10;
	if (vector.length < radius + threshold || Math.abs(vector.angle) < 15)
		return;
	var from = new Point(radius, 0);
	var through = from.rotate(vector.angle / 2);
	var to = from.rotate(vector.angle);
	var end = center.add(to);
	dashedItems.push(new Path.Line(center,
			center.add(new Point(radius + threshold, 0))));
	dashedItems.push(new Path.Arc(center.add(from), center.add(through), end));
	var arrowVector = to.normalize(7.5).rotate(vector.angle < 0 ? -90 : 90);
	dashedItems.push(new Path([
			end.add(arrowVector.rotate(135)),
			end,
			end.add(arrowVector.rotate(-135))
	]));
	if (label) {
		// Angle Label
		var text = new PointText(center.add(through.normalize(radius + 10)).add(new Point(0, 3)));

		text.content = Math.floor(vector.angle * 100) / 100 + '°';
		text.fillColor = 'black';
		items.push(text);
	}
}

function drawLength(from, to, sign, label, value, prefix) {
	var lengthSize = 5;
	if ((to.subtract(from)).length < lengthSize * 4)
		return;
	var vector = to.subtract(from);
	var awayVector = vector.normalize(lengthSize).rotate(90 * sign);
	var upVector = vector.normalize(lengthSize).rotate(45 * sign);
	var downVector = upVector.rotate(-90 * sign);
	var lengthVector = vector.normalize(
			vector.length / 2 - lengthSize * Math.sqrt(2));
	var line = new Path();
	line.add(from.add(awayVector));
	line.lineBy(upVector);
	line.lineBy(lengthVector);
	line.lineBy(upVector);
	var middle = line.lastSegment.point;
    console.log(middle)
	line.lineBy(downVector);
	line.lineBy(lengthVector);
	line.lineBy(downVector);
	dashedItems.push(line);
	if (label) {
		// Length Label
		var textAngle = Math.abs(vector.angle) > 90
				? textAngle = 180 + vector.angle : vector.angle;
		// Label needs to move away by different amounts based on the
		// vector's quadrant:
		var away = (sign >= 0 ? [1, 4] : [2, 3]).indexOf(vector.quadrant) != -1
				? 8 : 0;
                
		value = value || vector.length;
		var text = new PointText({
			point: middle.add(awayVector.normalize(away + lengthSize)),
			content: (prefix || '') + Math.floor(value * 1000) / 1000,
			fillColor: 'black',
			justification: 'center'
		});
		text.rotate(textAngle);
		items.push(text);
	}
}

var dashItem;
var noAction;
var arrowSelected;

global.currentLine = '';

const arrowMode = (action) => {
    if (action == 'off') {
        arrowTool.onMouseDown = null;
        arrowTool.onMouseDrag = null;
        return;
    }
    panControl('off');
    cursorMode('off');

    arrowTool.onMouseDown = function(event) {
        noAction = false;
        
        if (event.item) {
            let hitResult = canvas.project.hitTest(new Point(event.event.clientX, event.event.clientY), {
                segments: true,
                stroke: true,
                fill: true,
                tolerance: 2
            });
            if (hitResult) {
                console.warn('HITRESULT', hitResult)
                if (hitResult.item?.name && hitResult.item.name.includes('ch')) {
                    if (arrowSelected) {
                        arrowSelected.handlesGroup.opacity = 0;

                        arrowSelected.vItem.onMouseEnter = (e) => {
                            let handlesGroup = e.target.children[2];
                            handlesGroup.opacity = 1;
                            console.log('entered arrow:', e.target)
                        }
                
                        arrowSelected.vItem.onMouseLeave = (e) => {
                            let handlesGroup = e.target.children[2];
                            handlesGroup.opacity = 0;
                            console.log('left arrow:', e.target)
                        }
                    }
                    
                    console.warn('CONTROL HANDLE TOUCHED:', hitResult.item.name);
                    vectorItem = event.item;
                    arrowTool.onMouseDrag = (e) => {
                        adjustVector(e, hitResult.item, event.item)
                    };
                } else if (hitResult.type == 'stroke') {
                    console.warn('ARROW STROKE TOUCHED:', hitResult.item.parent);
                    arrowTool.onMouseDrag = (e) => {
                        console.log(e);
                        hitResult.item.parent.position = hitResult.item.parent.position.add(e.delta)
                    };
                    arrowTool.onMouseUp = () => {
                        arrowTool.onMouseUp = arrowToolMouseUpHandler;
                    };
                    return;
                }
            }
            if (event.item.name == 'globalPlayerGroup') {} else {
                return console.warn(event, event.item)
            }
        }

        if (arrowSelected) {
            //noAction = true;
            console.log(arrowSelected)
            arrowSelected.handlesGroup.opacity = 0;

            arrowSelected.vItem.onMouseEnter = (e) => {
                let handlesGroup = e.target.children[2];
                handlesGroup.opacity = 1;
                console.log('entered arrow:', e.target)
            }
    
            arrowSelected.vItem.onMouseLeave = (e) => {
                let handlesGroup = e.target.children[2];
                handlesGroup.opacity = 0;
                console.log('left arrow:', e.target)
            }

            arrowSelected = false;
        } 

        var end = vectorStart ? vectorStart.add(vector) : undefined;
        var create = false;
        if (event.modifiers.shift && vectorItem) {
            vectorStart = end;
            create = true;
        } else if (vector && (event.modifiers.option || end && end.getDistance(event.point) < 10)) {
            create = false;
        } else {
            vectorStart = event.point;
        }
        if (create) {
            dashItem = vectorItem;
            vectorItem = null;
        }
        let isNew = mouseIsUp ? true : false;

        let tempVector = event.point.subtract(vectorStart);

        processVector(event, true, isNew);
        mouseIsUp = false;
    //	document.redraw();
    }
    
    arrowTool.onMouseDrag = onMouseDragDefaultHandler;
    
    arrowTool.onMouseUp = function(event) {
        if (noAction) return console.warn('no action (mouseup)');

        if (adjustingFromBottom) {
            processVector(adjustingFromBottom, false);
            adjustingFromBottom = false;
        } else {
            processVector(event, false);
        }

        mouseIsUp = true;
        if (dashItem) {
            dashItem.dashArray = [1, 2];
            dashItem = null;
        }
        vectorPrevious = vector;

        console.log('MouseUp @ original:', vector, vectorItem)

        if (Math.abs(vector.x) < 5 && Math.abs(vector.y) < 5) {
            console.warn('arrow too short. @mouseup');
            vectorItem.remove();
        }

        let startingArrowPoint = vectorItem.children[0].segments[0].point;
        let endingArrowPoint = vectorItem.children[0].segments[1].point;

        let controlHandleGroup = new Group(); 
        let cH1 = new Path.Circle(startingArrowPoint, 5);
        let cH2 = new Path.Circle(endingArrowPoint, 5);
        cH1.fillColor = 'rgba(189, 218, 226, 0.8)';
        cH2.fillColor = 'rgba(189, 218, 226, 0.8)';
        cH1.name = 'ch1'
        cH2.name = 'ch2'
        cH1.strokeColor = '#333';
        cH2.strokeColor = '#333';

        controlHandleGroup.addChild(cH1)
        controlHandleGroup.addChild(cH2)
        controlHandleGroup.opacity = 1;

        vectorItem.addChild(controlHandleGroup);
        vectorItem.onMouseEnter = (e) => {
            let handlesGroup = e.target.children[2];
            handlesGroup.opacity = 1;
            console.log('entered arrow:', vectorItem)
        }
        vectorItem.onMouseLeave = (e) => {
            let handlesGroup = e.target.children[2];
            handlesGroup.opacity = 0;
            console.log('left arrow:', vectorItem)
        }
        vectorItem.onClick = (e) => {
            selectVector(e.target)
        };

        selectVector(vectorItem)
        arrowTool.onMouseDrag = onMouseDragDefaultHandler;
    }
}



//
//
// Section 3
// Formations, players, setup
//
//

const getViewScale = () => {
    return 0.5;
}
const getFormationHeight = () => {
    return canvas.view.bounds.height;
}
const getFormationWidth = () => {
    return canvas.view.bounds.width;
}
const getForce = () => {
    return qs('.force-toggle').dataset.force;
}
global.getForce = getForce;

const getPlayerFormationHeight = () => {
    // Make sure formation scale is overridden to 0.5, adjust positions
    // to your liking, then double.

    let players = canvas.project.activeLayer.children['globalPlayerGroup'].children;
    
    let highestY;
    let lowestY;
    
    let prev;
    players.forEach(p => {
        console.log(p);
        if (prev) {
            if (highestY) {
                if (p.position.y < highestY.position.y) {
                    highestY = p
                } 
            } else {
                highestY = p;
            }
            if (lowestY) {
                if (p.position.y > lowestY.position.y) {
                    lowestY = p;
                }
            } else {
                lowestY = p;
            }
        } else {
            prev = p;
        }
    });

    return {
        height: lowestY.position.y - highestY.position.y,
        adjustedHeight: lowestY.bounds.bottom - highestY.bounds.top,
        highestY,
        lowestY,
    }
}
global.getPlayerFormationHeight = getPlayerFormationHeight;

const horizontalStack = (options) => {
    let positions = [];
    let players = [
        {
            role: 'cutter',
            hierachy: 'primary',
            path: 'offense',
        },
        {
            role: 'cutter',
            hierachy: 'secondary',
            path: 'offense',
        },
        {
            role: 'cutter',
            hierachy: 'tertiary',
            path: 'offense',
        },
        {
            role: 'cutter',
            hierachy: 'quaternary',
            path: 'offense',
        },
        {
            role: 'handler',
            hierachy: 'primary',
            path: 'offensehandler',
        },
        {
            role: 'handler',
            hierachy: 'secondary',
            path: 'offensehandler',
        },
        {
            role: 'handler',
            hierachy: 'tertiary',
            path: 'offensehandler',
        },
    ];

    let middle = canvas.view.center.x;

    let visibleHeight = canvas.view.size.height;
    let margins = 300;
    let scale = (visibleHeight - margins) / 811;
    let formationHeight = (scale * 811) + margins;

    console.group('Horizontal Stack Formation')
    console.log({
        scale,
        visibleHeight,
        formationHeight,
    });
    console.groupEnd();

    players.forEach((player, index) => {
        let x = middle;
        let y = canvas.view.bounds.top + 220;

        if (player.role == 'cutter') {
            if (player.hierachy == 'primary') {
                x = middle - 80;
            }
            if (player.hierachy == 'secondary') {
                x = middle + 80;
            }
            if (player.hierachy == 'tertiary') {
                x = middle - 260;
                y -= 40;
            }
            if (player.hierachy == 'quaternary') {
                x = middle + 260;
                y -= 40;
            }
        }

        if (player.role == 'handler') {
            y += 160;
            if (player.hierachy == 'primary') {
                y += 100
            }
            if (player.hierachy == 'secondary') {
                x = middle + 260
                y = getForce() == 'forehand' ? y + 140 : getForce() == 'flat' ? y + 120 : y + 60
            }
            if (player.hierachy == 'tertiary') {
                x = middle - 260
                y = getForce() == 'forehand' ? y + 60 : getForce() == 'flat' ? y + 120 : y + 140
            }
        }

        if (options?.getPositionsOnly) {
            positions.push({
                x: x,
                y: y,
            });
            return;
        }

        let p = addPlayer(player, scale);
        p.position = new Point(x, y);

        if (options?.animate == true) {
            setTimeout(() => {
                p.tween({ opacity: 1 }, 400); 
            }, index * 100);
        } else {
            p.opacity = 1;
        }
    });

    if (options?.getPositionsOnly) {
        return positions;
    }
    canvasElement.dataset.formation = 'horizontalStack';
}
global.horizontalStack = horizontalStack;


const verticalStack = (options) => {
    // Formation height = scale * 910px

    let positions = [];
    let players = [
        {
            role: 'cutter',
            hierachy: 'primary',
            path: 'offense',
        },
        {
            role: 'cutter',
            hierachy: 'secondary',
            path: 'offense',
        },
        {
            role: 'cutter',
            hierachy: 'tertiary',
            path: 'offense',
        },
        {
            role: 'cutter',
            hierachy: 'quaternary',
            path: 'offense',
        },
        {
            role: 'cutter',
            hierachy: 'quinary',
            path: 'offense',
        },
        {
            role: 'handler',
            hierachy: 'primary',
            path: 'offensehandler',
        },
        {
            role: 'handler',
            hierachy: 'secondary',
            path: 'offensehandler',
        },
    ];

    let middle = canvas.view.center.x;

    let y = canvas.view.bounds.top + 140;

    let visibleHeight = canvas.view.size.height;
    let margins = 200;
    let scale = (visibleHeight - margins) / 1041;
    let formationHeight = (scale * 1041) + margins;

    //canvas.view.zoom = scale; how the heck do I do this?

    console.group('Vertical Stack Formation')
    console.log({
        scale,
        visibleHeight,
        formationHeight,
    });
    console.groupEnd();


    players.forEach((player, index) => {
        let x = index == 6 ? middle - (scale * 200) : middle;
        let step = index == 4 ? (scale * 130) * 2 : ((scale * 130));

        if (player.role == 'handler' && player.hierachy == 'secondary') {
            if (getForce() == 'forehand') {
                x = middle + (scale * 200);
            }
        }

        if (options.getPositionsOnly) {
            positions.push({
                x: x,
                y: y,
            });
            return y += step;
        } 

        let p = addPlayer(player, scale);
        p.position = new Point(x, y);

        if (options?.animate == true) {
            setTimeout(() => {
                p.tween({ opacity: 1 }, 400); 
            }, index * 100);
        } else {
            p.opacity = 1;
        }

        if (index == 6) {
            //console.warn('Formation height = ' + formationHeight + 'px');
        }

        return y += step;
    });

    if (options.getPositionsOnly) {
        return positions;
    }
    canvasElement.dataset.formation = 'verticalStack';
};
global.verticalStack = verticalStack;



//
//
// Section 4
// Page setup, inits
//
//


const initPage = () => {
    let globalPlayerGroup = new paper.Group();
    globalPlayerGroup.name = 'globalPlayerGroup';
    global.playerGroup = globalPlayerGroup;
    verticalStack({ animate: true });
    panControl('on');
};
initPage();

canvas.view.onResize = () => {
    let functionName = canvasElement.dataset.formation;
    alignCenter(window[functionName], { animate: false });
}

qs('.reset').onclick = () => {
    let functionName = canvasElement.dataset.formation;
    alignCenter(window[functionName], { animatePosition: true });
    //document.body.requestFullscreen();
}


const saveProject = () => {
    return console.error('Not implemented');
    let exportedJSON = canvas.project.exportJSON();
    let positions = {};

    let findFunc = (child) => {

        // Find a way to save Paths

        if (child.className != 'Group') {
            positions[child.id] = {
                x: child.position.x,
                y: child.position.y,
            };
        } else {
            child.children.forEach(findFunc);
        }
    }

    canvas.project.layers[0].children.forEach(findFunc);

    console.log(positions)

    // Eventually add a firebase database here
}
global.saveProject = saveProject;


(() => {
    if (window.matchMedia("(pointer: coarse)").matches) {
        let cont = qs('#canvas-container');
        let visibleView = window.visualViewport.height;
        let hiddenView = window.innerHeight - visibleView;

        //cont.style.height = `calc(100vh - ${(hiddenView + 70)}px)`;
        qs('.text').innerHTML = (`Visible: ${visibleView}px, Hidden: ${hiddenView}px`);
    }
})();

const cursorMode = (action) => {
    if (action == 'on') {
        arrowMode('off');
        panControl('on');
    }
}

let arrowModeButton = qs('.arrow-mode-wrapper');
arrowModeButton.onclick = (e) => {
    let modePrev = qs('.current-mode');

    if (modePrev != arrowModeButton) {
        arrowMode('on');
        arrowModeButton.classList.add('current-mode');
        modePrev.classList.remove('current-mode');
    } 
}

let selectModeButton = qs('.select-mode-wrapper');
selectModeButton.onclick = (e) => {
    let modePrev = qs('.current-mode');

    if (modePrev != selectModeButton) {
        cursorMode('on');
        selectModeButton.classList.add('current-mode');
        modePrev.classList.remove('current-mode');
    } 
}



// UI

import 'outclick';

qsAll('.side-bar > *').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (btn.classList.contains('display')) {
            return qs('.dropdown-wrapper').classList.remove('display');
        } else if (btn.classList.contains('dropdown-wrapper')) {
            qs('.dropdown-wrapper').classList.add('display');
        } else {
            qs('.dropdown-wrapper').classList.remove('display');
        }


        qsAll('.side-bar > *').forEach(b => {
            b.classList.remove('active');
            b.onoutclick = null;
        });

        btn.classList.add('active');
        btn.onoutclick = () => {
            btn.classList.remove('active');
        }
    })
})

qsAll('.dropdown-menu > li').forEach(li => {
    li.onclick = () => {
        qs('.dropdown-wrapper').classList.remove('display');
    }
})



const formationSelectHandler = (e) => {
    let canvasItems = canvas.project.activeLayer.children['globalPlayerGroup'].children;
    let formationName = e.value;

    if (formationName == canvasElement.dataset.formation) {
        console.log('same formation')
        return alignCenter(window[formationName], { animatePosition: true });
    }

    for (let i = canvasItems.length - 1; i >= 0; i--) {
        let item = canvasItems[i];
        item.tween({ opacity: 0 }, 200); 
        setTimeout(() => {
            item.remove();
        }, 200); 
    }

    setTimeout(() => {
        window[formationName]({
            getPositionsOnly: false,
            animate: true,
        });
        console.log('Called:', formationName)
    }, 200)
}

qsAll(".dropdown-menu li").forEach(li => {
    li.onclick = () => {
        qs('.drop-value').setText(li.innerText)
        qs('.dropdown input').setAttribute('value', li.id);
        formationSelectHandler(qs('.dropdown input'))
    };
})



let forceButtons = qsAll('.force-toggle-button');

forceButtons.forEach(button => {
    
    button.addEventListener('click', (e) => {
        // @ts-ignore
        qs('.force-toggle').dataset.force = button.dataset.force 
        qs('.force-toggle > button.active')?.classList.remove('active');
        button.classList.add('active')

        /**
         * @type {string}
         */
        let formationFunction = canvasElement.dataset.formation || 'verticalStack';
        return alignCenter(window[formationFunction], { animatePosition: true });
    });
})

