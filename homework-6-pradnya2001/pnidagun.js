d3.csv('data/global-meat-production-by-livestock-type.csv').then(data => {
    //Cleaning and parsing the data for better results
    data.forEach(d => {
        d.Year = +d.Year;
        d.beef = +d['Meat, beef and buffalo | 00001806 || Production | 005510 || tonnes'] || 0;
        d.poultry = +d['Meat, poultry | 00001808 || Production | 005510 || tonnes'] || 0;
        d.pig = +d['Meat, pig | 00001035 || Production | 005510 || tonnes'] || 0;
        d.sheep = +d['Meat, sheep and goat | 00001807 || Production | 005510 || tonnes'] || 0;
    });

    //pro and con visuals 
    createConsVisualization(data);
    createProsVisualization(data);
});

// RIGHT VISUALIZATION 
function createConsVisualization(data) {
    const margin = 
    {
         top: 40, right: 120, bottom: 70, left: 80 
    };
    const width = 650 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select('#conChart')
        .attr('viewBox', `0 0 650 500`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    //Major beef producing countries
    const countries = ['United States', 'Brazil', 'China'];
    const filteredData = data.filter(d => 
        countries.includes(d.Entity) && 
        d.Year >= 1961 && 
        d.Year <= 2023 &&
        d.beef > 0
    );

    //Grouping the countries
    const nested = d3.group(filteredData, d => d.Entity);

    //Creating scales
    const xScale = d3.scaleLinear()
        .domain([1961, 2023])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.beef) * 1.1])
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(countries)
        .range(['#cd2525ff', '#ce4319ff', '#bf360c']); 

    //Grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat('')
        );

    //X and Y axes
    const xAxis = svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .ticks(8)
            .tickFormat(d3.format('d')));

    const yAxis = svg.append('g')
        .call(d3.axisLeft(yScale)
            .ticks(6)
            .tickFormat(d => (d / 1000000).toFixed(1) + 'M'));

    //Axes styling
    xAxis.selectAll('text')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .style('fill', '#546e7a');
    
    yAxis.selectAll('text')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .style('fill', '#546e7a');

    //Labels for axes
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + 50)
        .text('Year');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('y', -60)
        .attr('x', -height / 2)
        .text('Beef Production (tonnes)');

    //Creating stacked effect area generator
    const area = d3.area()
        .x(d => xScale(d.Year))
        .y0(height)
        .y1(d => yScale(d.beef))
        .curve(d3.curveMonotoneX);

    const line = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d.beef))
        .curve(d3.curveMonotoneX);

    //Tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip');

    countries.forEach((country, i) => {
        const countryData = Array.from(nested.get(country) || []).sort((a, b) => a.Year - b.Year);
        
        //Area filling
        svg.append('path')
            .datum(countryData)
            .attr('fill', colorScale(country))
            .attr('opacity', 0.6)
            .attr('d', area)
            .attr('transform', `translate(0,${height})`)
            .transition()
            .duration(1501)
            .delay(i * 201)
            .attr('transform', 'translate(0,0)');

        //Strokes of lines
        const path = svg.append('path')
            .datum(countryData)
            .attr('fill', 'none')
            .attr('stroke', colorScale(country))
            .attr('stroke-width', 3)
            .attr('d', line);

        //Animate line 
        const totalLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', totalLength + ' ' + totalLength)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(1501)
            .delay(i * 201)
            .attr('stroke-dashoffset', 0);

        //Adding interactive points
        svg.selectAll(`.dot-${i}`)
            .data(countryData.filter((d, idx) => idx % 5 === 0)) 
            .enter()
            .append('circle')
            .attr('class', `dot-${i}`)
            .attr('cx', d => xScale(d.Year))
            .attr('cy', d => yScale(d.beef))
            .attr('r', 5)
            .attr('fill', colorScale(country))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .attr('opacity', 0)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(201)
                    .attr('r', 8);
                
                tooltip
                    .html(`
                        <strong>${d.Entity} (${d.Year})</strong><br/>
                        Beef-Production: ${(d.beef / 1000000).toFixed(2)}M tonnes<br/>
                        <em>Environmental impact: High emissions & land use</em>
                    `)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 30) + 'px')
                    .classed('visible', true);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 5);
                
                tooltip.classed('visible', false);
            })
            .transition()
            .delay(1501 + i * 201)
            .duration(400)
            .attr('opacity', 1);
    });

    //Legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width + 20}, 20)`);

    countries.forEach((country, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 30})`);

        legendRow.append('rect')
            .attr('width', 21)
            .attr('height', 21)
            .attr('fill', colorScale(country))
            .attr('opacity', 0.6);

        legendRow.append('text')
            .attr('x', 29)
            .attr('y', 16)
            .attr('class', 'legend-text')
            .style('font-size', '12px')
            .style('fill', '#546e7a')
            .text(country);
    });

    svg.append('text')
        .attr('x', width - 100)
        .attr('y', 31)
        .style('font-size', '14px')
        .style('font-weight', '700')
        .style('fill', '#c62828')
        .attr('text-anchor', 'end')
        .attr('opacity', 0)
        .text('Unsustainable')
        .transition()
        .delay(2001)
        .duration(601)
        .attr('opacity', 1);

    svg.append('text')
        .attr('x', width - 100)
        .attr('y', 50)
        .style('font-size', '14px')
        .style('font-weight', '700')
        .style('fill', '#c62828')
        .attr('text-anchor', 'end')
        .attr('opacity', 0)
        .text('Growth ↑')
        .transition()
        .delay(2200)
        .duration(600)
        .attr('opacity', 1);
}

//LEFT VISUALIZATION - PROS 
function createProsVisualization(data) {
    const margin = 
    {
         top: 40, right: 120, bottom: 70, left: 80 
    };
    const width = 650 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select('#proChart')
        .attr('viewBox', `0 0 650 500`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    //Filtering major countries producing poultry
    const countries = ['China', 'United States', 'Brazil', 'India'];
    const filteredData = data.filter(d => 
        countries.includes(d.Entity) && 
        d.Year >= 1961 && 
        d.Year <= 2023 &&
        d.poultry > 0
    );

    //Grouping countries
    const nested = d3.group(filteredData, d => d.Entity);

    //Scale creation
    const xScale = d3.scaleLinear()
        .domain([1961, 2023])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.poultry) * 1.1])
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(countries)
        .range(['#2e7d32', '#00897b', '#1976d2', '#43a047']); 

    //Grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat('')
        );

    //X and Y axes
    const xAxis = svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .ticks(8)
            .tickFormat(d3.format('d')));

    const yAxis = svg.append('g')
        .call(d3.axisLeft(yScale)
            .ticks(6)
            .tickFormat(d => (d / 1000000).toFixed(1) + 'M'));

    //Styling axes
    xAxis.selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#546e7a');
    
    yAxis.selectAll('text')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .style('fill', '#546e7a');

    //Labels for axes
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + 50)
        .text('Year');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('y', -60)
        .attr('x', -height / 2)
        .text('Poultry Production (tonnes)');

    //Line generator creation
    const line = d3.line()
        .x(d => xScale(d.Year))
        .y(d => yScale(d.poultry))
        .curve(d3.curveMonotoneX);

    //Tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip');

    countries.forEach((country, i) => {
        const countryData = Array.from(nested.get(country) || []).sort((a, b) => a.Year - b.Year);

        const path = svg.append('path')
            .datum(countryData)
            .attr('fill', 'none')
            .attr('stroke', colorScale(country))
            .attr('stroke-width', 4)
            .attr('d', line)
            .style('opacity', 0.8);

        //Animation for line drawing
        const totalLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', totalLength + ' ' + totalLength)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(1501)
            .delay(i * 201)
            .attr('stroke-dashoffset', 0);

        //Interactive points
        svg.selectAll(`.dot-pro-${i}`)
            .data(countryData.filter((d, idx) => idx % 5 === 0))
            .enter()
            .append('circle')
            .attr('class', `dot-pro-${i}`)
            .attr('cx', d => xScale(d.Year))
            .attr('cy', d => yScale(d.poultry))
            .attr('r', 6)
            .attr('fill', colorScale(country))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .attr('opacity', 0)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 9);
                
                tooltip
                    .html(`
                        <strong>${d.Entity} (${d.Year})</strong><br/>
                        Poultry-Production: ${(d.poultry / 1000000).toFixed(2)}M tonnes<br/>
                        <em>Efficient source of protein: 2kg feed per 1kg meat</em>
                    `)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 30) + 'px')
                    .classed('visible', true);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6);
                
                tooltip.classed('visible', false);
            })
            .transition()
            .delay(1501 + i * 201)
            .duration(400)
            .attr('opacity', 1);
    });

    //Legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width + 20}, 20)`);

    countries.forEach((country, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 30})`);

        legendRow.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 10)
            .attr('y2', 10)
            .attr('stroke', colorScale(country))
            .attr('stroke-width', 4);

        legendRow.append('text')
            .attr('x', 28)
            .attr('y', 15)
            .attr('class', 'legend-text')
            .style('font-size', '12px')
            .style('fill', '#546e7a')
            .text(country);
    });


    if (chinaData.length > 0) {
        const latestChina = chinaData[chinaData.length - 1];
        
        svg.append('line')
            .attr('x1', xScale(latestChina.Year))
            .attr('y1', yScale(latestChina.poultry))
            .attr('x2', xScale(latestChina.Year) + 80)
            .attr('y2', yScale(latestChina.poultry) - 60)
            .attr('stroke', '#2e7d32')
            .attr('stroke-width', 2)
            .attr('opacity', 0)
            .transition()
            .delay(2001)
            .duration(601)
            .attr('opacity', 0.8);

        svg.append('text')
            .attr('x', xScale(latestChina.Year) + 85)
            .attr('y', yScale(latestChina.poultry) - 65)
            .style('font-size', '14px')
            .style('font-weight', '701')
            .style('fill', '#2e7d32')
            .attr('opacity', 0)
            .text('20M+ tonnes!')
            .transition()
            .delay(2200)
            .duration(600)
            .attr('opacity', 1);

        svg.append('text')
            .attr('x', xScale(latestChina.Year) + 85)
            .attr('y', yScale(latestChina.poultry) - 47)
            .style('font-size', '11px')
            .style('font-weight', '601')
            .style('fill', '#2e7d32')
            .attr('opacity', 0)
            .text('Feeding billions')
            .transition()
            .delay(2400)
            .duration(600)
            .attr('opacity', 1);
    }
}