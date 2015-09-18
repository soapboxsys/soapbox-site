// pickWinningProp should have different voting strategies
function pickWinningProp(globalSums) {
    return mostCommonFloor(globalSums);
}

// Garzik's most common floor
function mostCommonFloor(globalSums) {

    var aggCounts = Object.keys(globalSums).map(function(s) {
        return { size: s, votes: globalSums[s]};
    }); 

    var total = d3.sum(aggCounts.map(function(s) { return s.votes }));
    var fifth = Math.floor(total/5);


    // Trim the bottom fifth
    aggCounts.sort(function(a, b) { return a.size.localeCompare(b.size) });
    aggCounts = trim(aggCounts, fifth)
    
    // Trim the top fifth
    aggCounts.sort(function(b, a) { return a.size.localeCompare(b.size) });
    aggCounts = trim(aggCounts, fifth)

    // The winner is the mode of the remaining options
    var max = 0
    var winner;
    aggCounts.forEach(function(d) {
        if (d.votes > max) {
            max = d.votes;
            winner = d.size;
        }
    });

    console.log(aggCounts);
    return winner;
}

// trim takes the counts list and returns a trimmed copy with [size] removed
// Could just use the array of the raw votes and slice of chop of that array
// then tally then all up after the slice.
function trim(aggCounts, chop) {
    var counts = JSON.parse(JSON.stringify(aggCounts));
    var r = 0;
    var i = 0;
    while (r < chop) {
        var c = counts[i] 
        r += c.votes;    
        if (r >= chop) {
            break;
        }
        i ++;
    }
    var lstDiff = r - chop;
    if (lstDiff > 0) {
        counts[i].votes = r - chop; 
    } else {
        i++;
    }

    return counts.slice(i)
}


// SimpleModel will always vote for its size preference regardless of what
// other players are doing.
function SimpleModel(state, preference) {
    this.s = state;
    this.sizePref = preference;
}

SimpleModel.prototype.vote = function() {
    return this.sizePref;
}

function selectWinningModel(models) {
    return models[randInt(0, 1)];
}
