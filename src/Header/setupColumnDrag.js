'use strict';

var Region     = require('region')
var DragHelper = require('drag-helper')
var findDOMNode = require('react-dom').findDOMNode

const VERTICAL_DRAG_THRESHOLD = 100

function range(start, end){
    var res = []

    for ( ; start <= end; start++){
        res.push(start)
    }

    return res
}

function buildIndexes(direction, index, dragIndex){
    var indexes = direction < 0 ?
                    range(index, dragIndex):
                    range(dragIndex, index)

    var result = {}

    indexes.forEach(function(value){
        result[value] = true
    })

    return result
}

module.exports = function(header, props, column, event){

    event.preventDefault()

    var headerNode   = findDOMNode(header)
    var headerRegion = Region.from(headerNode)
    var dragColumn = column
    var dragColumnIndex
    var columnData
    var shiftRegion

    DragHelper(event, {

        //constrainTo: headerRegion.expand({ top: true, bottom: true}),

        onDragStart: function(event, config){

            var columnHeaders = headerNode.querySelectorAll('.' + props.cellClassName)

            columnData = props.columns.map(function(column, i){
                var region = Region.from(columnHeaders[i])

                if (column === dragColumn){
                    dragColumnIndex = i
                    shiftRegion = region.clone()
                }

                return {
                    column: column,
                    index: i,
                    region: region
                }
            })

            header.setState({
                dragColumn: column,
                dragging  : true
            })

            config.columnData = columnData

        },
        onDrag: function(event, config){
            var diffLeft = config.diff.left
            var diffTop = config.diff.top
            var directionHSign = diffLeft < 0? -1: 1
            var directionVSign = diffTop < 0? -1: 1
            var state = {
                dragColumnIndex  : dragColumnIndex,
                dragColumn  : dragColumn,
                dragLeft    : diffLeft,
                dragTop     : (diffTop < -VERTICAL_DRAG_THRESHOLD ? diffTop: 0),
                dropIndex   : null,
                shiftIndexes: null,
                shiftSize   : null,
                verticalDrag: false
            }

            var shift
            var shiftSize
            var newLeft   = shiftRegion.left + diffLeft
            var newRight  = newLeft + shiftRegion.width
            // "throttle" vertical drag: only has effects when exceed certain range (VERTICAL_DRAG_THRESHOLD).
            // and if so, disable horizontal shifts
            var newTop    = shiftRegion.top
            if(diffTop < -VERTICAL_DRAG_THRESHOLD){
              newTop    = shiftRegion.top + diffTop
              // disable/reset horizontal shifts
              newLeft = shiftRegion.left;
              newRight = newLeft + shiftRegion.width
              state.verticalDrag = true
            }
            var newBottom    = shiftRegion.height + newTop

            console.log('newBottom: ', newBottom)
            var shiftZone = { left: newLeft, right: newRight, top: newTop, bottom: newBottom}

            config.columnData.forEach(function(columnData, index, arr){

                var itColumn = columnData.column
                var itRegion = columnData.region

                if (shift || itColumn === dragColumn){
                    return
                }

                var itLeft  = itRegion.left
                var itRight = itRegion.right
                var itZone  = directionHSign == -1?
                            { left: itLeft, right: itLeft + itRegion.width }:
                            { left: itRight - itRegion.width, right: itRight }

                if (shiftRegion.width < itRegion.width){
                    //shift region is smaller than itRegion
                    shift = Region.getIntersectionWidth(
                            itZone,
                            shiftZone
                        ) >= Math.min(
                            itRegion.width,
                            shiftRegion.width
                        ) / 2

                } else {
                    //shift region is bigger than itRegion
                    shift = Region.getIntersectionWidth(itRegion, shiftZone) >= itRegion.width / 2
                }

                if (shift) {
                    shiftSize = -directionHSign * shiftRegion.width
                    state.dropIndex = index
                    state.shiftIndexes = buildIndexes(directionHSign, index, dragColumnIndex)
                    state.shiftSize = shiftSize
                }
            })

            header.setState(state)
        },

        onDrop: function(event){
            header.onDrop(event)
        }
    })
}
