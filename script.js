/* BUTTONS */
const button_major = d3.select("#option_major");
const button_smaller = d3.select("#option_smaller");

/* CANVAS DIMENSIONS */
const width = 900;
const height = 560;

const marginTop = 70;
const marginLeft = 120;
const marginRight = 70;
const marginBottom = 90;

const plottingWidth = width - marginLeft - marginRight;
const plottingHeight = height - marginBottom - marginTop;

/* SVG */
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

/* TOOLTIP */
const tooltip = d3.select("#tooltip");

/* CSV DATA 
The CSV stores all values as strings by default. So, I will convert Year and Share
into numbers here. This will use these values correctly in scales, axes, and line positions later in the chart.*/
d3.csv("https://cdn.jsdelivr.net/gh/kuhikaarwaan/ai-hiring-demand-across-economies@main/Data/ai_jobs_selected_countries.csv", function (d) {
    return {
        year: +d.Year,
        country: d.Country,
        share: +d.Share,
        group: d.Group
    };

}).then(function (data) {

/* SORT DATA BY YEAR */
data.sort((a, b) => a.year - b.year);

/* DATA TO 2 BUTTONS 
I will use one button for each variation */
const majorData = data.filter(d => d.group === "Major AI economies");
const smallerData = data.filter(d => d.group === "Smaller advanced economies");

/* VISIBLE BUTTON VIEW */
let currentVisibleData = majorData;

/* MIN AND MAX VALUES */
    const yearMin = d3.min(data, d => d.year);
    const yearMax = d3.max(data, d => d.year);

    const majorMax = d3.max(majorData, d => d.share);
    const smallerMax = d3.max(smallerData, d => d.share);

/* SCALES 
The x-scale maps years to horizontal pixel positions.
The y-scale will show AI job share percentages to vertical pixel positions. */
const xScale = d3.scaleLinear()
    .domain([yearMin, yearMax])
    .range([marginLeft, marginLeft + plottingWidth]);

    const yScale = d3.scaleLinear()
    .domain([0, majorMax])
    .range([marginTop + plottingHeight, marginTop]);

/* COLOR SCALE*/
    const colorScale = d3.scaleOrdinal()
        .domain([
            "United States",
            "United Kingdom",
            "Canada",
            "Australia",
            "New Zealand",
            "Netherlands"
        ])
        .range([
            "#1f77b4",
            "#d62728",
            "#2ca02c",
            "#9467bd",
            "#ff7f0e",
            "#8c564b"
        ]);

/* LINE GENERATOR */
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.share));

/* 3 COUNTRY ARRAYS 
Both the variations will show exactly 3 countries, so I will keep three explicit arrays*/
let country1 = majorData.filter(d => d.country === "United States");
let country2 = majorData.filter(d => d.country === "United Kingdom");
let country3 = majorData.filter(d => d.country === "Canada");

/* GRID LINES */
const yGrid = svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(
        d3.axisLeft(yScale)
        .tickSize(-plottingWidth)
        .tickFormat("")
    );

/* AXES */
const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));

const xAxisElement = svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height - marginBottom})`)
    .call(xAxis);

const yAxisElement = svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${marginLeft}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => d + "%"));

/* AXIS LABELS */
svg.append("text")
    .attr("x", marginLeft + plottingWidth / 2)
    .attr("y", height - marginBottom / 2)
    .attr("class", "axis-label")
    .text("Year");

svg.append("text")
    .attr("x", marginLeft / 2)
    .attr("y", marginTop + plottingHeight / 2)
    .attr("transform", "translate(-210 280) rotate(-90)")
    .attr("class", "axis-label")
    .text("AI Job Postings Share (%)");

/* 3 LINES */
const line1 = svg.append("path")
.datum(country1)
    .attr("class", "line-path")
    .attr("stroke", colorScale(country1[0].country))
    .attr("d", line);

const line2 = svg.append("path")
.datum(country2)
    .attr("class", "line-path")
    .attr("stroke", colorScale(country2[0].country))
    .attr("d", line);

const line3 = svg.append("path")
.datum(country3)
    .attr("class", "line-path")
    .attr("stroke", colorScale(country3[0].country))
    .attr("d", line);

/* POINTS */
svg.selectAll(".point")
    .data(country1.concat(country2).concat(country3))
    .join("circle")
    .attr("class", "point")
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.share))
    .attr("r", 5)
    .attr("fill", d => colorScale(d.country));

/* HOVERING INTERACTIONS (Ref: https://observablehq.com/@d3/d3-bisect and https://d3js.org/d3-array/bisect)*/

/* VERTICAL HOVER LINE */
const hoverLine = svg.append("line")
    .attr("class", "hover-line")
    .attr("x1", marginLeft)
    .attr("x2", marginLeft)
    .attr("y1", marginTop)
    .attr("y2", height - marginBottom);

/* HOVER CIRCLES */
const hoverCircles = svg.selectAll(".hover-circle")
    .data([0, 1, 2])
    .join("circle")
    .attr("class", "hover-circle")
    .attr("r", 7);

/* ARRAY OF VISIBLE COUNTRIES FOR HOVER INTERACTIONS */
/* AI DISCLOSURE: I used AI to understand how to implement this approach using arrays.
Reason - There are multiple rows per year and I did not know how to sort the values for bisecting specifically. I eventually adapted the logic to work with my currentVisibleData.*/
function getVisibleYears() {
    const years = currentVisibleData.map(function(d) {
        return d.year;
    });

    const uniqueYears = Array.from(new Set(years));

    uniqueYears.sort(function(a, b) {
        return a - b;
    });

    return uniqueYears;
}

/* D3 BISECTOR (Ref: https://observablehq.com/@d3/d3-bisect and https://d3js.org/d3-array/bisect)
The mouse can be between years to get the nearest actual year in the data

This is how it will work:
- mouse > pixel > data
- bisector will find the nearest year
- it will compare the neighboring years*/
const bisectYear = d3.bisector(d => d).left;

function getNearestYear(event) {
    const pointer = d3.pointer(event, svg.node());
    const mouseX = pointer[0];

    const hoveredYearValue = xScale.invert(mouseX);
    const visibleYears = getVisibleYears();

    const index = bisectYear(visibleYears, hoveredYearValue);

    if (index <= 0) {
        return visibleYears[0];
    }

    if (index >= visibleYears.length) {
        return visibleYears[visibleYears.length - 1];
    }

    const yearBefore = visibleYears[index - 1];
    const yearAfter = visibleYears[index];

    return (hoveredYearValue - yearBefore) > (yearAfter - hoveredYearValue)
        ? yearAfter
        : yearBefore;
}

/* TOOLTIP FOR HOVERED YEAR */
function showTooltip(event, hoveredYear) {
    const hoveredRows = currentVisibleData
        .filter(d => d.year === hoveredYear)
        .sort((a, b) => b.share - a.share);

    let tooltipHTML = "<div class='tooltip-year'>" + hoveredYear + "</div>";

    hoveredRows.forEach(function(d) {
        tooltipHTML += "<div class='tooltip-row'>" + "<div class='tooltip-country'>" + "<span class='tooltip-swatch' style='background:" + colorScale(d.country) + ";'></span>" + "<span>" + d.country + "</span>" + "</div>" + "<strong>" + d.share.toFixed(1) + "%</strong>" + "</div>";
    });

    tooltip
        .style("opacity", 1)
        .html(tooltipHTML)
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 18) + "px");
}

/* MOVE TOOLTIP */
function moveTooltip(event) {
    tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 18) + "px");
}

/* HIDE TOOLTIP */
function hideTooltipAndHover() {
    tooltip.style("opacity", 0);
    hoverLine.style("opacity", 0);
    hoverCircles.style("opacity", 0);
}

/* INVISIBLE HOVER RECTANGLE 
Initially, the idea was to hover over the small circles. But, that was not user-friendly because the mouse had to be exactly over the circle to trigger that interaction. So, instead, I created a transparent rectangle that covers the entire plotting area.

That can let the mouse move freely across the chart and still trigger the interaction.
The rectangle understands the mouse movement, which is then used to calculate the nearest year
and update the tooltip and vertical guide line.*/
const hoverRect = svg.append("rect")
    .attr("x", marginLeft)
    .attr("y", marginTop)
    .attr("width", plottingWidth)
    .attr("height", plottingHeight)
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .on("mousemove", function(event) {
        const nearestYear = getNearestYear(event);

        const hoveredRows = currentVisibleData
            .filter(d => d.year === nearestYear)
            .sort((a, b) => b.share - a.share);

    hoverLine
            .style("opacity", 1)
            .attr("x1", xScale(nearestYear))
            .attr("x2", xScale(nearestYear));

    hoverCircles
        .data(hoveredRows)
            .style("opacity", 1)
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.share))
            .attr("fill", d => colorScale(d.country));

        showTooltip(event, nearestYear);
        moveTooltip(event);
    })
    .on("mouseleave", function() {
        hideTooltipAndHover();
    });


/* UPDATE VIEW */
function updateChart(newCountry1, newCountry2, newCountry3, newMax, subtitleText, legend1, legend2, legend3) {
    yScale.domain([0, newMax]);

currentVisibleData = newCountry1.concat(newCountry2).concat(newCountry3);

/* UPDATE GRID */
yGrid.transition()
.duration(500)
    .call(
    d3.axisLeft(yScale)
        .tickSize(-plottingWidth)
        .tickFormat("")
);

/* UPDATED Y AXIS */
yAxisElement.transition()
    .duration(500)
    .call(d3.axisLeft(yScale).tickFormat(d => d + "%"));

/* UPDATED 3 LINES */
line1.datum(newCountry1)
    .transition()
    .duration(500)
    .attr("stroke", colorScale(newCountry1[0].country))
    .attr("d", line);

line2.datum(newCountry2)
    .transition()
    .duration(500)
    .attr("stroke", colorScale(newCountry2[0].country))
    .attr("d", line);

line3.datum(newCountry3)
    .transition()
    .duration(500)
    .attr("stroke", colorScale(newCountry3[0].country))
    .attr("d", line);

/* UPDATED POINTS
Since the data is changing between the variations, it is safer to update the points*/
const visibleData = newCountry1.concat(newCountry2).concat(newCountry3);

svg.selectAll(".point")
    .data(visibleData, d => d.country + "_" + d.year)
    .join("circle")
    .attr("class", "point")
    .attr("r", 5)
    .transition()
    .duration(500)
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.share))
    .attr("fill", d => colorScale(d.country));

/* UPDATED SUBTITLE + LEGEND */
d3.select("#chart-subtitle").text(subtitleText);
d3.select("#legend-1").text(legend1);
d3.select("#legend-2").text(legend2);
d3.select("#legend-3").text(legend3);

/* UPDATE LEGEND COLORS */
d3.select(".line-1").style("background", colorScale(newCountry1[0].country));
d3.select(".line-2").style("background", colorScale(newCountry2[0].country));
d3.select(".line-3").style("background", colorScale(newCountry3[0].country));

hideTooltipAndHover();
}

/* BUTTON TRANSITIONS */
button_major.on("click", () => {

    const newCountry1 = majorData.filter(d => d.country === "United States");
    const newCountry2 = majorData.filter(d => d.country === "United Kingdom");
    const newCountry3 = majorData.filter(d => d.country === "Canada");

updateChart(
    newCountry1,
    newCountry2,
    newCountry3,
    majorMax,
    "United States, United Kingdom, and Canada",
    "United States",
    "United Kingdom",
    "Canada"
    );

    button_major.classed("selected", true);
    button_smaller.classed("selected", false);
});

button_smaller.on("click", () => {

    const newCountry1 = smallerData.filter(d => d.country === "Australia");
    const newCountry2 = smallerData.filter(d => d.country === "New Zealand");
    const newCountry3 = smallerData.filter(d => d.country === "Netherlands");

    updateChart(
    newCountry1,
    newCountry2,
    newCountry3,
    smallerMax,
    "Australia, New Zealand, and the Netherlands",
    "Australia",
    "New Zealand",
    "Netherlands"
    );

    button_major.classed("selected", false);
    button_smaller.classed("selected", true);
});

});