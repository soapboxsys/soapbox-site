'use strict';

// SimState returns an object the represents the simulations current state.
var SimState = function(startDay) {
    // Raw Vote counts and computed aggregates
    this.dayCounts = [];
    this.daySums = [];
    this.globalSums = {};
    this.castVotes = 0;
    this.endTarget = 12000;
    this.startDay = startDay.getTime();
    // A Pointer to where we are in the Simulation 
    this.currentDay = this.startDay;

    // Tunable speeds
    this.dayLength = 100;
    this.animDuration = 100;

}
SimState.prototype.simOver = function() {
    return this.castVotes >= this.endTarget;
}  

// Step forward one day in the simulation
SimState.prototype.updateState = function(dayCount) {
    // Change the day
    
    this.currentDay += 86400000;        
    // See counts.json for schema of dailySums
    var dailySum = { date: dayCount.date, blocks: {}};

    // Update globalSums, castVotes, and daySums
    for (var i = 0; i < dayCount.votes.length; i++) {
        var v = dayCount.votes[i];
        if (this.globalSums.hasOwnProperty(v)) {
            this.globalSums[v] ++;
        } else {
            this.globalSums[v] = 1;
        }
        this.castVotes += 1;            

        if (dailySum.blocks.hasOwnProperty(v)) {
            dailySum.blocks[v] ++;
        } else {
            dailySum.blocks[v] = 1;
        }
    }

    // Push the latest days onto the lists
    this.dayCounts.push(dayCount);
    this.daySums.push(dailySum);        
}


// initializeSim receives the selection to place all of the rendered content in
// creates all of the charts and creates the actors for the simulation.
function initializeSim(selection, startDay) {
    // Global State
    var s = new SimState(startDay);
    
    // Vote Charts
    var charts = new BipCharts(s, selection);

    // Actor Models
    var models = [new SimpleModel(s, 1000000), new SimpleModel(s, 2000000)];


    // run proceeds from startDay to the end of the simulation iteratively 
    // calling models.vote and updating the state of the charts.
    function run() {
        simDay();
    }

    function simDay() {
        var votesToday = randInt(75, 135);   
        var dayCount = { date: s.currentDay, votes: []};

        if ((s.castVotes + votesToday) >= s.endTarget) {
            votesToday = s.endTarget - s.castVotes;
        }
        for (var i = 0; i < votesToday; i ++) {
            var m = selectWinningModel(models);
            var c = m.vote();
            dayCount.votes.push(c)
        }
        updateGlobalState(dayCount);
        if (!s.simOver()) {
            setTimeout(simDay, s.dayLength);
        }
    }

    // UpdateGlobalState handles the simulation proceeding through a day
    // by first updating simState and then the charts, timers and winner
    // if nessecary.
    function updateGlobalState(count) {
        s.updateState(count); 

        if (s.simOver()) {
            var winner = pickWinningProp(s.globalSums);
            charts.conclude(winner);
        } else {
            charts.update();
        }
    }

    return run;
}


function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
