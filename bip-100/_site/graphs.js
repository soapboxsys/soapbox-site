'use strict';

function BipCharts(state, selection) {
    this.voteBar = voteBarChart(state, selection);
    this.voteBar();

    this.dailyVotes = dailyVotesChart(state, selection);
    this.dailyVotes();

    this.summaryTbl = summaryTable(state, selection);
    this.summaryTbl();
}

BipCharts.prototype.update = function(){
    this.voteBar.update();
    this.dailyVotes.update();
    this.summaryTbl.update();
}

BipCharts.prototype.conclude = function(winner){
    this.update();
    d3.select('div.status').text('The winner is '+ sizeLabel({size: winner}))
        .classed({'done': true})
}

function voteBarChart(state, selection) {
    var s = state;

    var margin = { top: 70, right: 40, bottom: 70, left: 30};
    var width = 800;
    var height = 180;
    var innerHeight = height - margin.top - margin.bottom;

    var svg = selection.append('svg')
        .attr('class', 'count-graph')
        .attr('width', width)
        .attr('height', height);

    var innerChart = svg.append('g')
        .attr('class', 'inner-chart')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // Create the X scale and the axis
    var x = d3.scale.linear()
        .domain([0, s.endTarget])
        .range([0, width - margin.left - margin.right]);

    // Initialize the chart with axis and labels
    function chart() {

        // Create the x-axis
        var xAxis = d3.svg.axis().scale(x)
            .ticks(10)
            .orient('bottom');

        svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + (margin.top + innerHeight) + ')')
            .attr('class', 'axis')
            .call(xAxis)

        // Title the chart
        svg.append('text')
            .attr('class', 'title')
            .attr('y', 15)
            .text('Total Vote Counts')

        // Draw 1/4 lines and labels
        var p = [0.25, 0.5, 0.75]
        var l = innerChart.selectAll('percent')
          .data(p).enter().append('g')
            .attr('class', 'percent') 
            .attr('transform', function(d) {
                var t = x(d*s.endTarget);
                return 'translate('+t+',0)'
            });
            
        var offset = innerHeight + 0.5*margin.bottom;
        l.append('line').attr('class', 'threshold')
            .attr('x1', 0).attr('x2', 0).attr('y1', 0)
            // draw line to 1/2 of the bottom margin
            .attr('y2', offset);

        l.append('text').attr('class', 'label')
            .attr('y', offset+15)
            .attr('x', -8)
            .text(function(d) { 
                return d3.format('%')(d);
            });
    }

    // Finds the midpoint of a proposal
    function midPt(d) {
        return (d.votes/2);
    }

    chart.update = function() {

        // Convert Sums into a list of objects.
        var counts = Object.keys(s.globalSums).map(function(k) {
            return { size: k, votes: s.globalSums[k]};
        }); 
         
        // Sort counts by votes
        counts.sort(function(a, b) { return b.votes - a.votes });
        
        // Find the top 5 (or all of the current active proposals)
        var leading = counts.length < 5 ? counts : counts.slice(0, 5);
        leading.map(function(d) {d.type = "top";})

        // Mark the rest as fringe proposals
        var fringe = [];
        if (counts.length > 5) {
            fringe = counts.slice(5);
            fringe.map(function (d) {d.type = "fringe";});
        }

        // The final list to use in the display
        var aggCounts = [].concat(leading, fringe);
        
        // Sort the final lst in lexographic order
        aggCounts.sort(function(a, b) { return a.size.localeCompare(b.size) });
        
        var color = d3.scale.category10()
            .domain(aggCounts.map(function(d){ return "c"+d.size }));
   
        // Tally a running sum of votes
        var sum = 0;
        for (var i = 0; i < aggCounts.length; i++) {
            sum += aggCounts[i].votes
            // Update count elem with running sum.
            aggCounts[i].rsum = sum;
        }

        // Add Uncounted to aggCounts
        var uncntd = { 
            size: "novote", 
            votes: s.endTarget - s.castVotes,
            rsum: s.endTarget
        };

        if (uncntd.votes > 0) {
            aggCounts.push(uncntd);
        }

        // Add the proposals to the chart
        var barSec = innerChart.selectAll('.proposals')
            .data(aggCounts, function(d) { return d.size; })

        barSec.transition()
            .duration(s.animDuration)
            .attr('transform', function(d){ 
                var p = x(d.rsum - d.votes);  
                return 'translate('+p+',0)';
            })

        barSec.select('.bar')
            .attr('y', 0)
            .attr('height', innerHeight)
            .attr('fill', function(d) {
                    return proposalColor(d.size);
            })
            .attr('width', function(d){ 
                return x(d.votes);
            })

        barSec.exit().remove();

        var gEnter = barSec.enter().append('g')
            .attr('class', 'proposals')

        gEnter.append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', function(d){ return x(d.votes)})
            .attr('height', innerHeight)
            .attr('fill', function(d) {
                return proposalColor(d.size);
            })

        barSec.select('.label')
          .transition()
            .duration(s.animDuration)
            .call(posishMidG);
            

        var lblEnter = gEnter.append('g')
            .attr('class', 'label')
            .call(posishMidG);

        function posishMidG(s) {
            s.attr('transform', function(d) {
                var p = x(midPt(d));
                return 'translate(' + p + ',' + innerHeight/2 + ')'; 
            });
        }

        lblEnter.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 2);


        // Ensure that the underline fits the text's width
        lblEnter.append('path')
            .attr('d', function(d) {
                var s = 'M0 0 l7 -45 h';
                var w = 20 + 7*sizeLabel(d).length;
                return s + w;
            })

        lblEnter.append('text')
            .attr('x', 13)
            .attr('y', -47)
            .text(sizeLabel);

    }

    return chart;
}


function propCon(counts) {

    function retSize(e) { return e.size }
    var countSizes = counts.map(retSize);

    // Sort counts by votes
    countSizes.sort(function(a, b) { return b.localeCompare(a); })

    var colors = d3.scale.ordinal()
        .domain(countSizes)
        .range([
           '#ffffd9',
           '#edf8b1',
           '#c7e9b4',
           '#7fcdbb',
           '#41b6c4',
           '#1d91c0',
           '#225ea8',
           '#253494',
           '#081d58'
        ]);
    
    function proposalColor(size) {
        if (size == "abstain") {
            return "#D62728";
        }
        return colors(size);
    }
    return proposalColor;
}

function dailyVotesChart(state, selection) {
    var s = state;

    var margin = {top: 40, right: 20, bottom: 20, left: 30};
    var width = 500;
    var height = 150;

    var innerHeight = height - margin.top - margin.bottom;
    var innerWidth = width - margin.left - margin.right;

    var svg = selection.append('svg')
            .attr('class', 'timeline')
            .attr('width', width)
            .attr('height', height);
    
    var innerChart = svg.append('g')
        .attr('class', 'inner-chart')
        .attr('transform', 'translate('+margin.left+','+margin.top+')');
    
    var frstDay = s.startDay + 86400000;
    // TODO temporary prediction
    var lstDay = s.startDay + 86400000*120;


    // Create the time scale
    var xScale = d3.time.scale.utc()
        .domain([frstDay, lstDay])
        .range([0, width - 2*margin.left]);
    

    // Create the y scale 
    var yScale = d3.scale.linear()
        .domain([0, 150])
        .range([innerHeight, 0]);


    function chart(selection) {
        // Add a title to the chart
        svg.append('text').attr('class', 'title')
            .attr('y', 15)
            .text('Votes by Day')

        
        // Create the time axis
        var xAxis = d3.svg.axis()
            .orient('bottom')
            .ticks(5)
            .scale(xScale);

        // Add the x-axis to the chart
        var tmp = 'translate(' + margin.left + ',' + (margin.top+innerHeight) + ')';
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', tmp)
            .call(xAxis)

        // Create the vote scale for each day.
        var stackSums = s.daySums.map(function(day) {
            return d3.sum(day.stacks, function(elem) { 
                return elem.votes;
            })
        });
        
        // Create the y-axis and add it to the chart
        var yAxis = d3.svg.axis()
            .orient('left')
            .ticks(4)
            .scale(yScale);

        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate('+margin.left+',' +margin.top+')')
            .call(yAxis);

        // Mark the day of the upcoming block vote
        // TODO temporary. Make prediction robust
        var dDay = lstDay;
        innerChart.append('line')
           .attr('class', 'decision day')
           .attr('x1', xScale(dDay))
           .attr('x2', xScale(dDay))
           .attr('y1', 0)
           .attr('y2', innerHeight)

    }
    
    chart.update = function() {

        // Compute stacks for each day
        s.daySums.forEach(function(d) {
            var y0 = 0;
            d.stacks = [];
            var keys = d3.keys(d.blocks)
            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                var elem = {
                    name: k,
                    votes: d.blocks[k],
                    y0: y0,
                }
                // update y0 and set y1 to that val
                y0 += d.blocks[k];
                elem.y1 = y0;
                d.stacks.push(elem);
            }
        });

        // Add all of the days to the chart
        var day = innerChart.selectAll('.day')
            .data(s.daySums)
          .enter()
            .append('g')
            .attr('class', 'day')
            .attr('transform', function(d) { 
                return 'translate('+xScale(d.date)+',0)';
            })

        // Stack bars on the chart
        day.selectAll('.proposals')
            .data(function(d) { 
                return d.stacks })
          .enter()
            .append('rect')
            .attr('class', 'proposals')
            .attr('x', 0)
            .attr('y', function(d) { return yScale(d.y1); })
            .attr('width', 4)
            .attr('height', function(d) {
                return yScale(d.y0) - yScale(d.y1);  
            })
            .attr('fill', function(d) {
               return proposalColor(d.name); 
            })
             


    }

    return chart
}

// An html table built out with d3.
function summaryTable(state, selection) {
    var s = state;

    var percentScale = d3.scale.linear()
        .domain([0, s.endTarget])
        .range([0, 1]);

    function percentf(votes) {
        var p = percentScale(votes); 
        var f = d3.format('.4p');
        return f(p); 
    }

    function retSize(d) { return d.size }
    function retVotes(d) { return d.votes }

    var table = selection.append('table').attr('class', 'summary');
    var tbody = table.append('tbody');

    function chart() {
        var thead = table.append('thead').append('tr');
        thead.append('td');
        thead.append('td');
        thead.append('td').attr('class', 'percent').text('Percent');
        thead.append('td').attr('class', 'amnt').text('Votes');
       
        // Add the summary rows
        // Not Cast stays at the top
        tbody.append('tr')
            .attr('class', 'totals not-cast')
            .call(addSumCols('Not Cast'))

        // Cast and Total Go at the bottom
        var cast = tbody.append('tr')
            .attr('class', 'totals cast')
            .call(addSumCols('Cast'))
        
    }

    function addSumCols(label) {
        return function(s) {
            s.append('td')
            s.append('td').attr('class', 'label').text(function(d) {
                return label;
            });
            s.append('td').attr('class', 'percent');
            s.append('td').attr('class', 'amnt');
        }
    }

    chart.update = function() {
        // Copy counts
        var counts = Object.keys(s.globalSums).map(function(k) {
            return {size: k, votes: s.globalSums[k]};
        });

        // Sort counts by votes
        counts.sort(function(a, b) { return b.votes - a.votes });

        var row = tbody.selectAll('.counts')
            .data(counts, retSize)
        
        // Update the existing rows
        row.select('.percent').text(percentText)
        row.select('.amnt').text(function(d) {
            return d.votes;
        });

        // Add any new rows
        row.enter().insert('tr', '.totals')
            .attr('class', 'counts')
            .call(makeRow)

        // Update the summary rows
        var d = s.endTarget - s.castVotes;
        var notCast = tbody.select('.totals.not-cast')
            .datum({votes: d})
        notCast.select('.percent').text(percentText);
        notCast.select('.amnt').text(retVotes);

        var cast = tbody.select('.totals.cast')
            .datum({votes: s.castVotes})
        cast.select('.percent').text(percentText);
        cast.select('.amnt').text(retVotes)
    };

    function makeRow(s) {
        s.append('td')
            .attr('class', 'color')
            .call(keySquare)
        s.append('td')
            .attr('class', 'label')
            .text(sizeLabel)

        s.append('td')
            .attr('class', 'percent')
            .text(percentText)

        s.append('td')
            .attr('class', 'amnt')
            .text(function(d){ return d.votes});
    }

    function percentText(d) {
        return percentf(d.votes); 
    }

    return chart;
}

function keySquare(s) {
    var w = 15,
        h = 15;
    s.append('svg')
        .attr('class', 'key')
        .attr('width', w)
        .attr('height', h)
      .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('rx', 3)
        .attr('width', w)
        .attr('height', h)
        .style('fill', function(d) {
            return proposalColor(d.size);
        });
}

// sizeLabel takes a count Json object and returns the appropriate label for it
// based on the 'size' attribute.
function sizeLabel(d) {
    if (d.size == "abstain") {
        return "Abstained";
    } else if (d.size == "novote") {
        return "Not Voted";
    } else {
        var f = d3.format('s');
        return f(d.size)+"B";
    }
}
