var sizeProps = [
    "abstain",
    "1000000",
    "2000001",
    "2500000",
    "2505000",
    "3003200",
    "3300343",
    "5000000"
];

// Randomly selects an element from the list
function pickElem(lst) {
    var e = lst[Math.floor(Math.random()*lst.length)];
    return e;
}

// Creates 12,000 votes spread out over 87 to 92 days
function genRandTimeline() {
    var d = Math.floor(87 + Math.random()*5)

    var end = new Date();
    var itr = end.getTime() - d*86400000
    console.log(itr, end)

    var timeline = []
    
    for (var i = 0; i < d; i ++) {
        var o = {
            date: itr + i*86400000,
            blocks: {}
        }
        timeline.push(o);
    }

    for (var i = 0; i < 12000; i++) {
        var day = pickElem(timeline);
        var c = pickElem(sizeProps);

        if (day.blocks.hasOwnProperty(c)) {
            day.blocks[c] += 1;
        } else {
            day.blocks[c] = 1;
        }
    }

    return timeline
}

function buildAggs(timeline) {
    var cMap = {};
    sizeProps.forEach(function(prop) {
        cMap[prop] = 0;
    });

    timeline.forEach(function(d) {
        for (prop in d.blocks) {
            cMap[prop] += d.blocks[prop];            
        }
    });

    var counts = [];
    for (k in cMap) {
        counts.push({'size': k, 'votes': cMap[k]});
    }

    return counts
}

function buildDataSet() {
    t = genRandTimeline();
    c = buildAggs(t);
    return {"counts": c, "timeline": t};
}
