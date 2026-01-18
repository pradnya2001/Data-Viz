// Set the dimensions of the canvas / graph

const margin = {top: 10, right: 20, bottom: 50, left: 50};
const width = 800 - margin.left - margin.right;
const height = 470 - margin.top - margin.bottom;

// parse the date / time
// const parseTime = d3.timeParse("%d-%b-%y");


//Seeting sclaes - X,Y, Radius
const xScale = d3.scaleLog().range([0, width]); 

const yScale = d3.scaleLinear().range([height, 0]); 

const radiusScale = d3.scaleLinear().range([4, 10]); 

// define the line
// const valueline = d3.line()
//                     .x(function(d) { return xScale(d.date); })
//                     .y(function(d) { return yScale(d.close); });


//Step 1: Appending the SVG element to the center div
const svg = d3.select(".center").append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
              .append("g")
              .attr("transform", `translate(${margin.left},${margin.top})`);

//Changing the data source to - gapminderDataFiveYear.tsv
d3.tsv("data/gapminderDataFiveYear.tsv", d => ({
    
    year: +d.year,
    pop: +d.pop,
    lifeExp: +d.lifeExp,
    gdpPercap: +d.gdpPercap })).then(data => {
        

    // Filtering the year data only to 1952 and 2007
    data = data.filter(d => d.year === 1952 || d.year === 2007);

    // console.log(d3.min(data, d => d.lifeExp));

    //Scaling the X,Y and Radius 
    xScale.domain([d3.min(data, d => d.gdpPercap), d3.max(data, d => d.gdpPercap)]);
    yScale.domain([d3.min(data, d => d.lifeExp), d3.max(data, d => d.lifeExp)]);
    radiusScale.domain(d3.extent(data, d => d.pop));


    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain([1952, 2007]);

//     Add the valueline
//     svg.append("path")
//         .data([data])
//         .attr("class", "line")
//         .attr("d", valueline);

   

    svg.selectAll("dot")
       .data(data)
       .enter().append("circle")
       .attr("r", d => radiusScale(d.pop))
       .attr("cx", d => xScale(d.gdpPercap))
       .attr("cy", d => yScale(d.lifeExp))
       .style("fill", d => colorScale(d.year))
       .style("opacity", 0.8);
       
 

    // X-axis 
    const xAxis = d3.axisBottom(xScale).ticks(11, ".0s");
                     

    svg.append("g").attr("transform", `translate(0, ${height})`).call(xAxis).style("font-family", "Lato"); 

    // Y-axis
    const yAxis = d3.axisLeft(yScale);
                     
    
    svg.append("g").call(yAxis);
       
    // X-Axis label
    svg.append("text")
       .text("GDP per Capita")
       .attr("x", width / 2)
       .attr("y", height + margin.bottom - 3) 
       .attr("text-anchor", "middle")
       .style("font-family", "sans-serif")
       .style("font-size", "14px")
       .style("font-weight", "700");
      

   // Y-axis label
    svg.append("text")
       .text("Life Expectancy")
       .attr("transform","rotate(-90)")
       .attr("x",-height/2)
       .attr("y",-margin.left + 10) 
       .attr("text-anchor","middle")
       .style("font-family","sans-serif")
       .style("font-size","14px")
       .style("font-weight","700");

    // Title
    svg.append("text")
    .text("GDP vs Life Expectancy (1952 , 2007)")
    .attr("x",width/2)
    .attr("y",-margin.top+15)
    .attr("text-anchor","middle")  
    .style("font-family","sans-serif")
    .style("font-size","16px")
    .style("font-weight","700")
    .style("text-decoration","underline")  
  
    //Legend
    const legend=svg.append("g").attr("transform",`translate(${width - 30},20)`);
                     
    const legendData = colorScale.domain();

    const legendItems = legend.selectAll(".legend-item")
                              .data(legendData)
                              .enter()
                              .append("g")
                              .attr("class", "legend-item")
                              .attr("transform", (d, i) => `translate(0, ${i * 17})`);
    
    //Legend Rectangles
    legendItems.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 13)
        .attr("height", 13)
        .style("fill", d => colorScale(d));

    //Legend Text 
    legendItems.append("text")
        .attr("x",20)
        .attr("y",11)
        .text(d =>d)
        .style("font-family", "sans-serif")
        .style("font-size", "11px");
        


});
