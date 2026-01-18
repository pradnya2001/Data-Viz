(
    function() {

    'use strict';

    //Global and Constant variables
    let allData, currentSelectedData, currentDataSelection = [];
    let attributes = { quant: [], categori: [] };
    let colorScale, xScale, yScale, xBoxScale, yBoxScale;
    let svgOfScatter, svgOfBoxplot, scatterPlotMainG, boxplotMainG;
    let isItViolinMode = false; 

    //Dimensions - Scatter and Box Plots
    const marginns = { top: 20, right: 150, bottom: 60, left: 70 };
    let scatterPlotDims, boxplotDims;
    let scatterPlotWidth, scatterPlotHeight, boxplotWidth, boxplotHeight;

    //Dataset URLs with sources
    const datasetsMap = {
        'penguins': 'https://raw.githubusercontent.com/dataprofessor/data/master/penguins_cleaned.csv',
        'pokemon': 'Pokemon.csv', 
    };
    
    //Columns to not consider from the Pokemon Dataset
    const ignoredPokemonCols = new Set(['#', 'Name', 'Type 2']);

    
    //Single boxplot animation duration
    const ANIMAT_DURATION = 750; 

    //Single boxplot stagger delay
    const STAGGER_DELAYS = 150; 

    
    //Initiation of the visualization
    function init() {
        setupSVGs();
        setupScales();
        setupEventListeners();
        setupLasso();
        
        loadData(); //Load the dataset
    }

    //Setup functions:
    function setupSVGs() {

        //SVG - Scatter Plot
        svgOfScatter = d3.select('#scatterplot-svg');
        scatterPlotDims = svgOfScatter.node().getBoundingClientRect();
        scatterPlotHeight = scatterPlotDims.height - marginns.top - marginns.bottom;
        scatterPlotWidth = scatterPlotDims.width - marginns.left - marginns.right;
        
        
        svgOfScatter.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(${marginns.left}, ${scatterPlotHeight + marginns.top})`);
        
        svgOfScatter.append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(${marginns.left}, ${marginns.top})`);
            
        //X and Y Axis labels
        svgOfScatter.append('text')
            .attr('class', 'axis-label x-axis-label')
            .attr('transform', `translate(${marginns.left + scatterPlotWidth / 2}, ${scatterPlotHeight + marginns.top + marginns.bottom - 10})`)
            .text('X Attribute');
            
        svgOfScatter.append('text')
            .attr('class', 'axis-label y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', marginns.left - 50)
            .attr('x', -(marginns.top + scatterPlotHeight / 2))
            .text('Y Attribute');

        //Scatter plot points group
        scatterPlotMainG = svgOfScatter.append('g')
            .attr('transform', `translate(${marginns.left}, ${marginns.top})`);

        //Legend
        svgOfScatter.append('g')
            .attr('class', 'legend-g')
            .attr('transform', `translate(${marginns.left + scatterPlotWidth + 20}, ${marginns.top})`);

        //SVG - Box Plot
        svgOfBoxplot = d3.select('#boxplot-svg');
        boxplotDims = svgOfBoxplot.node().getBoundingClientRect();
        boxplotHeight = boxplotDims.height - marginns.top - marginns.bottom;
        boxplotWidth = boxplotDims.width - marginns.left - marginns.right;
        

        //X-axis:Quantitative
        svgOfBoxplot.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(${marginns.left}, ${boxplotHeight + marginns.top})`);
            
        //Y-axis:Categorical
        svgOfBoxplot.append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(${marginns.left}, ${marginns.top})`);

        //X-axis:Label
        svgOfBoxplot.append('text')
            .attr('class', 'axis-label x-axis-label')
            .attr('transform', `translate(${marginns.left + boxplotWidth / 2}, ${boxplotHeight + marginns.top + marginns.bottom - 15})`)
            .text('Boxplot Attribute');

        //Box Plot points group
        boxplotMainG = svgOfBoxplot.append('g')
            .attr('transform', `translate(${marginns.left}, ${marginns.top})`);
    }

    //D3 Scales group setup
    function setupScales() 
    {
        xScale = d3.scaleLinear().range([0, scatterPlotWidth]);
        yScale = d3.scaleLinear().range([scatterPlotHeight, 0]);

        //10 Distinct colors
        colorScale = d3.scaleOrdinal(d3.schemeTableau10);

        yBoxScale = d3.scaleBand().range([0, boxplotHeight]).padding(0.1);
        xBoxScale = d3.scaleLinear().range([0, boxplotWidth]);
        
    }

    //Setting up event listeners for dropdowns and button
    function setupEventListeners() 
    {
        d3.select('#dataset-select').on('change', onDatasetChange);

        d3.select('#y-select').on('change', onScatterChange);
        d3.select('#x-select').on('change', onScatterChange);
        
        d3.select('#color-select').on('change', onScatterChange);
        d3.select('#toggle-violin').on('click', toggleViolin);
        d3.select('#boxplot-select').on('change', onBoxplotChange);
        
    }

    //Event Handlers for buttons and dropdowns

    function onDatasetChange() 
    {
        loadData();
    }
    
    function onScatterChange() 
    {
        updateScatterPlot();

        //Clearing the section as scatter plot attribute changes
        clearSelection(); 
    }

    function onBoxplotChange() 
    {
        updateBoxPlotAxis();

        //Clearing the section as box plot attribute changes
        clearSelection();
    }

    function toggleViolin() 
    {
        isItViolinMode = !isItViolinMode;
        
        //Button text update on toggle
        d3.select('#toggle-violin').text(isItViolinMode ? 'Show Box Plot' : 'Show Violin Plot');
        
        //Visualization changes based on selection
        if (currentDataSelection.length > 0) 
        {
            updateBoxPlot();
        }
    }

    //Data Loading and Parsing fuctions

    //Loading of dataset from dropdown 
    function loadData() 
    {
        let selectedValue = d3.select('#dataset-select').property('value');
        let url = datasetsMap[selectedValue] || selectedValue;

        d3.csv(url).then(data => {
            allData = data;
            parseData(allData);
            updateDropdowns();
            
            //Trigger updates for scatter and box plots
            updateScatterPlot();
            updateBoxPlotAxis();
            clearSelection();  //Lasso is cleared 

        }).catch(error => {
            console.error('Error loading dataset:', error);
            alert(`Failed to load dataset: ${url}. Check the URL and file location.`);
        });
    }

    //Parsing of dataset to identify quantitative and categorical attributes
    function parseData(data) 
    {
        attributes.quant = [];
        attributes.categori = [];
        
        if (data.length === 0) return;

        let columns = Object.keys(data[0]);
        let selectedDataset = d3.select('#dataset-select').property('value');
        
        columns.forEach(col => {
            //Ignoring the mentioned columns from Pokemon dataset
            if (selectedDataset === 'pokemon' && ignoredPokemonCols.has(col)) {
                return;
            }

            //Testing to see if a column is quantitative
            let isQuant = true;
            let sample = data.find(d => d[col] !== null && d[col] !== undefined && d[col] !== "");
            
            if (sample === undefined || isNaN(+sample[col])) {
                isQuant = false;
            }

            if (isQuant) 
                {
                attributes.quant.push(col);
               
                data.forEach(d => {
                    d[col] = (d[col] === null || d[col] === "") ? undefined : +d[col];
                });
            } else 
                {
                attributes.categori.push(col);
            }
        });
        
        //Unique ID for data points
        data.forEach((d, i) => d.id = i);
        currentSelectedData = data;
    }

    //Populating dropdowns based on dataset attributes
    function updateDropdowns() {
        function populateSelect(selector, data) {
            const select = d3.select(selector);
            const options = select.selectAll('option').data(data);
            
            options.enter().append('option')
                .merge(options)
                .attr('value', d => d)
                .text(d => d);
                
            options.exit().remove();
        }

        populateSelect('#y-select', attributes.quant);
        populateSelect('#x-select', attributes.quant);
        
        populateSelect('#color-select', attributes.categori);
        populateSelect('#boxplot-select', attributes.quant);
    }

    //Scatter Plot - Transitions and animations

    function updateScatterPlot() {
        if (!currentSelectedData) return;

        const yAttrib = d3.select('#y-select').property('value');
        const xAttrib = d3.select('#x-select').property('value');
        
        const colorAttr = d3.select('#color-select').property('value');

        //Scales updation
        xScale.domain(d3.extent(currentSelectedData, d => d[xAttrib])).nice();
        yScale.domain(d3.extent(currentSelectedData, d => d[yAttrib])).nice();
        
        //Color domain updation
        const colorDomain = Array.from(new Set(currentSelectedData.map(d => d[colorAttr]))).sort();
        colorScale.domain(colorDomain);
        
        //Axes gets updated according to the transitions
        svgOfScatter.select('.x-axis')
            .transition().duration(ANIMAT_DURATION)
            .call(d3.axisBottom(xScale));
        
        svgOfScatter.select('.y-axis')
            .transition().duration(ANIMAT_DURATION)
            .call(d3.axisLeft(yScale));
            
        //Axis labels are updated
        svgOfScatter.select('.x-axis-label').text(xAttrib);
        svgOfScatter.select('.y-axis-label').text(yAttrib);

        //Data Join
        const points = scatterPlotMainG.selectAll('.scatter-point')
            .data(currentSelectedData, d => d.id); 
            
        points.enter()
            .append('circle')
            .attr('class', 'scatter-point')
            .attr('cy', yScale.range()[0]) //Bottom of plot
            .attr('cx', d => xScale(d[xAttrib])) 
            .attr('r', 0) //Start with radius as 0
            .attr('fill', d => colorScale(d[colorAttr]))
            .merge(points) //Merge enter and update 
            .transition().duration(ANIMAT_DURATION) 
            .attr('cy', d => yScale(d[yAttrib]))
            .attr('cx', d => xScale(d[xAttrib]))
            .attr('r', 5)
            .attr('fill', d => colorScale(d[colorAttr]));
            
        points.exit()
            .transition().duration(ANIMAT_DURATION)
            .attr('r', 0) 
            .remove();

        //Legend updation
        updateLegend(colorDomain);
    }
    
    //Update color legend for scatter plot
    function updateLegend(colorDomain) {
        const legendG = svgOfScatter.select('.legend-g');
        const legendItem = legendG.selectAll('.legend-item')
            .data(colorDomain);
            
        const legendEntering = legendItem.enter().append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`);
            
        legendEntering.append('rect')
            .attr('class', 'legend-rect')
            .attr('width', 15)
            .attr('height', 15);
            
        legendEntering.append('text')
            .attr('class', 'legend-text')
            .attr('x', 20)
            .attr('y', 12.5);
            
        //Update all items (enter + update)
        const legendMerging = legendEntering.merge(legendItem);
        legendMerging.attr('transform', (d, i) => `translate(0, ${i * 20})`);
        legendMerging.select('.legend-rect')
            .attr('fill', d => colorScale(d));
        legendMerging.select('.legend-text')
            .text(d => d);
            
        legendItem.exit().remove();
    }


    //Lasso Interaction for Scatter Plot

    let lassoPoint = [];
    let startingPoint = null;

    function setupLasso() {
        const drag = d3.drag()
            .on('start', dragStarts)
            .on('drag', dragDrags)
            .on('end', dragEnds);
            
        svgOfScatter.call(drag);
    }

    function dragStarts(event) {
        lassoPoint = [d3.pointer(event, scatterPlotMainG.node())];
        startingPoint = lassoPoint[0];
        
        //Remove any existing lasso path
        scatterPlotMainG.select('.lasso-path').remove();
        
        //New lasso path
        scatterPlotMainG.append('path')
            .attr('class', 'lasso-path');
    }

    function dragDrags(event) 
    {
        lassoPoint.push(d3.pointer(event, scatterPlotMainG.node()));
        
        //Update path attribute
        scatterPlotMainG.select('.lasso-path')
            .attr('d', `M${lassoPoint.join('L')}Z`);
    }

    function dragEnds(event) 
    {
        let endingPoint = d3.pointer(event, scatterPlotMainG.node());
        
        //Check if it was a click or lasso
        const dist = Math.hypot(endingPoint[0] - startingPoint[0], endingPoint[1] - startingPoint[1]);
        
        if (dist < 5) {
            //clear selection when its a click
            clearSelection();
        } else {
            // if its a lasso, then find selected points
            findSelectedPoints();
        }
        
        //remove the lasso path  after selection

        scatterPlotMainG.select('.lasso-path').remove();
    }


    function findSelectedPoints() 
    {
        const yAttrib = d3.select('#y-select').property('value');
        const xAttrib = d3.select('#x-select').property('value');
        
        currentDataSelection = currentSelectedData.filter(d => {
            const point = [xScale(d[xAttrib]), yScale(d[yAttrib])];
            return d3.polygonContains(lassoPoint, point);
        });

        updateSelectedViz();
        updateBoxPlot(); 
    }

    function clearSelection() 
    {
        currentDataSelection = [];
        updateSelectedViz();
        updateBoxPlot(); 
    }


    function updateSelectedViz() 
    {
        const selectedID = new Set(currentDataSelection.map(d => d.id));
        
        scatterPlotMainG.selectAll('.scatter-point')
            .classed('selected', d => selectedID.has(d.id))
            .classed('unselected', d => currentDataSelection.length > 0 && !selectedID.has(d.id));
            
        //Count display gets updated
        d3.select('#selected-count').text(currentDataSelection.length);
    }


    //Box Plot - Transitions and animations

    function updateBoxPlotAxis() 
    {
        if (!currentSelectedData || currentSelectedData.length === 0) return;
        
        const boxplotAttr = d3.select('#boxplot-select').property('value');
        if (!boxplotAttr) return; 

        xBoxScale.domain(d3.extent(currentSelectedData, d => d[boxplotAttr])).nice();
        
        svgOfBoxplot.select('.x-axis')
            .transition().duration(ANIMAT_DURATION) // transition duration
            .call(d3.axisBottom(xBoxScale));
            
        svgOfBoxplot.select('.x-axis-label').text(boxplotAttr); //updating the x axis label
    }

    //Summary Statistics computation for box plot/violin plot

    function computeSummaryStats() {
        const colorAttr = d3.select('#color-select').property('value');
        const boxplotAttr = d3.select('#boxplot-select').property('value');
        
        //Grouping by color attributes
        const groupedData = d3.group(currentDataSelection, d => d[colorAttr]);
        
        //All categories from color scale domain
        const allCategories = colorScale.domain();
        
        yBoxScale.domain(allCategories); 
        const boxHeight = yBoxScale.bandwidth();

        const summaryData = [];

        allCategories.forEach(category => {
            const groupPoints = groupedData.get(category) || [];
            const values = groupPoints.map(d => d[boxplotAttr]).filter(v => v !== undefined && !isNaN(v)).sort(d3.ascending);
            const count = values.length;
            
            let stats = {
                category: category,
                count: count,
                boxHeight: boxHeight,
                outliers: [],
                points: [],
                q1: null,
                median: null,
                q3: null,
                kde: null,
                whiskers: [null, null]
                
            };

            if (count > 0 && count < 5) {
                
                stats.points = groupPoints.filter(d => d[boxplotAttr] !== undefined && !isNaN(d[boxplotAttr]));
            } else if (count >= 5) {
                
                stats.q1 = d3.quantile(values, 0.25);
                stats.median = d3.quantile(values, 0.5);
                stats.q3 = d3.quantile(values, 0.75);
                
                const iqrt = stats.q3 - stats.q1;
                const lowerFences = stats.q1 - 1.5 * iqrt;
                const upperFences = stats.q3 + 1.5 * iqrt;
                
                //Find min/max values for whiskers withiin fences
                stats.whiskers[0] = d3.min(values.filter(v => v >= lowerFences));
                stats.whiskers[1] = d3.max(values.filter(v => v <= upperFences));
                
                //Finding the outliers

                stats.outliers = groupPoints.filter(d => {
                    const val = d[boxplotAttr];
                    return val !== undefined && !isNaN(val) && (val < stats.whiskers[0] || val > stats.whiskers[1]);
                });
                
                // Compute KDE - violin plot
                if (isItViolinMode) 
                    {
                    stats.kde = computeKDE(values, boxHeight);
                }
            }
            summaryData.push(stats);
        });

        return summaryData; // summary statsitcs of all categories is returned
    }

    //Compute kernel density estimation(KDE) for violin plot

    function computeKDE(values, boxHeight) {
        if (values.length < 5) return null;
        
        const bandwidth = 0.5 * d3.deviation(values);
        const min = d3.min(values);
        const max = d3.max(values);
        const range = max - min;
        const padding = range * 0.1;
        
        //create sample points for the data range

        const samples = 50;
        const step = (range + 2 * padding) / samples;
        const points = [];
        
        for (let i = 0; i <= samples; i++) {
            const x = min - padding + i * step;
            let density = 0;
            
            //Gaussian kernel estimation
            values.forEach(v => {
                const z = (x - v) / bandwidth;
                density += Math.exp(-0.5 * z * z);
            });
            
            density = density / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
            points.push({ x, density });
        }
        
        //Normalize density to fit within the box height
        const maxmDensity = d3.max(points, d => d.density);
        const scale = (boxHeight * 0.4) / maxmDensity; //40% box size each side
        
        points.forEach(p => p.scaledDensity = p.density * scale);
        
        return points;
    }

    // Update box or violin plot with transitions and animations
    function updateBoxPlot() {
        if (!currentSelectedData) return;
        
        const summaryData = computeSummaryStats();
        const boxplotAttr = d3.select('#boxplot-select').property('value');

        //Update Y-axis scale
        svgOfBoxplot.select('.y-axis')
            .transition().duration(ANIMAT_DURATION)
            .call(d3.axisLeft(yBoxScale));

        //Data is joined on boxplot groups 
        const groups = boxplotMainG.selectAll('.boxplot-group')
            .data(summaryData, d => d.category);  //By Category

        //Shrink - exit transitions
        const exitingGroups = groups.exit();
        const exitTransition = exitingGroups.transition() // exit group transition
            .duration(ANIMAT_DURATION)
            .delay((d, i) => i * STAGGER_DELAYS);

        //All elements are faded out
        exitTransition.selectAll('.outlier, .small-group-point')
            .duration(ANIMAT_DURATION / 4)
            .attr('r', 0);
            
        exitTransition.selectAll('.violin-path')
            .duration(ANIMAT_DURATION / 4)
            .attr('opacity', 0);
            
        //Shrinkig animations for box plot elements
        exitTransition.select('.box')
            .delay(ANIMAT_DURATION / 4)
            .attr('y', d => d.boxHeight / 2)
            .attr('height', 0);
            
        exitTransition.select('.median-line')
            .delay(ANIMAT_DURATION / 4)
            .attr('y1', d => d.boxHeight / 2)
            .attr('y2', d => d.boxHeight / 2);
            
        exitTransition.selectAll('.whisker')
            .delay(ANIMAT_DURATION / 4)
            .attr('y1', d => d.boxHeight / 2)
            .attr('y2', d => d.boxHeight / 2);
            
        exitingGroups.transition().delay(ANIMAT_DURATION * 1.5).remove();

        //Entering transitions to grow box plot elements
        const enteringGroups = groups.enter()
            .append('g')
            .attr('class', 'boxplot-group')
            .attr('transform', d => `translate(0, ${yBoxScale(d.category)})`);

        //Adding the box plot elements; Main whisker line, end caps, median line, box, violin path
        enteringGroups.append('line')
            .attr('class', 'whisker whisker-main')
            .attr('x1', d => xBoxScale(d.whiskers[0] ?? 0))
            .attr('x2', d => xBoxScale(d.whiskers[1] ?? 0))
            .attr('y1', d => d.boxHeight / 2)
            .attr('y2', d => d.boxHeight / 2);

        //Whisker end 
        enteringGroups.append('line')
            .attr('class', 'whisker whisker-cap-low')
            .attr('x1', d => xBoxScale(d.whiskers[0] ?? 0))
            .attr('x2', d => xBoxScale(d.whiskers[0] ?? 0))
            .attr('y1', d => d.boxHeight / 2)
            .attr('y2', d => d.boxHeight / 2);
            
        enteringGroups.append('line')
            .attr('class', 'whisker whisker-cap-high')
            .attr('x1', d => xBoxScale(d.whiskers[1] ?? 0))
            .attr('x2', d => xBoxScale(d.whiskers[1] ?? 0))
            .attr('y1', d => d.boxHeight / 2)
            .attr('y2', d => d.boxHeight / 2);
        
        //Box - rectangle
        enteringGroups.append('rect')
            .attr('class', 'box')
            .attr('x', d => xBoxScale(d.q1 ?? 0))
            .attr('width', d => xBoxScale(d.q3 ?? 0) - xBoxScale(d.q1 ?? 0))
            .attr('y', d => d.boxHeight / 2)
            .attr('height', 0);
            
        //Median line of the entering box plot
        enteringGroups.append('line')
            .attr('class', 'median-line')
            .attr('x1', d => xBoxScale(d.median ?? 0))
            .attr('x2', d => xBoxScale(d.median ?? 0))
            .attr('y1', d => d.boxHeight / 2)
            .attr('y2', d => d.boxHeight / 2);
        
        //Violin plot is added but is initially hidden
        enteringGroups.append('path')
            .attr('class', 'violin-path')
            .attr('opacity', 0);

        //Upate and merge entering and updating groups
        const mergingGroups = enteringGroups.merge(groups);

        //Applying transitions to each box plot group
        mergingGroups.each(function(d, i) {
            const g = d3.select(this);
            const t = g.transition()
                .duration(ANIMAT_DURATION)
                .delay(i * STAGGER_DELAYS);

            //Old outliers and small group points are faded out
            g.selectAll('.outlier, .small-group-point')
                .transition(t)
                .duration(ANIMAT_DURATION * 0.25)
                .attr('r', 0)
                .remove();

            if (isItViolinMode) 
                {
                //Violin plot transitions
                
                //If whiskers exist, they are faded out
                t.selectAll('.whisker')
                    .duration(ANIMAT_DURATION * 0.25)
                    .attr('opacity', 0);
                
                //Box is changed to violin shape
                if (d.kde && d.count >= 5) {
                    const violinArea = d3.area()
                        .x(p => xBoxScale(p.x))
                        .y0(p => d.boxHeight / 2 - p.scaledDensity)
                        .y1(p => d.boxHeight / 2 + p.scaledDensity)
                        .curve(d3.curveBasis);
                    
                    //Box to violin transition
                    t.select('.box')
                        .delay(ANIMAT_DURATION * 0.25)
                        .duration(ANIMAT_DURATION * 0.5)
                        .attr('opacity', 0);
                    
                    //Violin path transition
                    t.select('.violin-path')
                        .delay(ANIMAT_DURATION * 0.25)
                        .duration(ANIMAT_DURATION * 0.5)
                        .attr('d', violinArea(d.kde))
                        .attr('fill', colorScale(d.category))
                        .attr('opacity', 0.6)
                        .attr('stroke', '#000')
                        .attr('stroke-width', 1);
                    
                    //Median line is kept visible
                    t.select('.median-line')
                        .delay(ANIMAT_DURATION * 0.25)
                        .duration(ANIMAT_DURATION * 0.5)
                        .attr('x1', xBoxScale(d.median))
                        .attr('x2', xBoxScale(d.median))
                        .attr('y1', d.boxHeight * 0.2)
                        .attr('y2', d.boxHeight * 0.8);
                } 
                else {
                    //No violin so shrink box to the center
                    t.select('.box')
                        .delay(ANIMAT_DURATION * 0.25)
                        .duration(ANIMAT_DURATION * 0.25)
                        .attr('y', d => d.boxHeight / 2)
                        .attr('height', 0);
                    
                    t.select('.median-line')
                        .delay(ANIMAT_DURATION * 0.25)
                        .duration(ANIMAT_DURATION * 0.25)
                        .attr('y1', d => d.boxHeight / 2)
                        .attr('y2', d => d.boxHeight / 2);
                }
                
            } 
            else 
                {
                //Mode - box plot transitions
                
                //Violin plot is faded out if found
                t.select('.violin-path')
                    .duration(ANIMAT_DURATION * 0.25)
                    .attr('opacity', 0);
                
                //Animate whiskers of the box plot
                t.select('.whisker-main')
                    .delay(ANIMAT_DURATION * 0.25)
                    .duration(ANIMAT_DURATION * 0.25)
                    .attr('x1', d => xBoxScale(d.count >= 5 ? d.whiskers[0] : 0))
                    .attr('x2', d => xBoxScale(d.count >= 5 ? d.whiskers[1] : 0))
                    .attr('y1', d => d.boxHeight / 2)
                    .attr('y2', d => d.boxHeight / 2)
                    .attr('opacity', d => d.count >= 5 ? 1 : 0);
                    
                t.select('.whisker-cap-low') // low whisker cap
                    .delay(ANIMAT_DURATION * 0.25)
                    .duration(ANIMAT_DURATION * 0.25)
                    .attr('x1', d => xBoxScale(d.count >= 5 ? d.whiskers[0] : 0))
                    .attr('x2', d => xBoxScale(d.count >= 5 ? d.whiskers[0] : 0))
                    .attr('y1', d => d.count >= 5 ? d.boxHeight * 0.25 : d.boxHeight / 2)
                    .attr('y2', d => d.count >= 5 ? d.boxHeight * 0.75 : d.boxHeight / 2)
                    .attr('opacity', d => d.count >= 5 ? 1 : 0);
                    
                t.select('.whisker-cap-high') // high whisker cap
                    .delay(ANIMAT_DURATION * 0.25)
                    .duration(ANIMAT_DURATION * 0.25)
                    .attr('x1', d => xBoxScale(d.count >= 5 ? d.whiskers[1] : 0))
                    .attr('x2', d => xBoxScale(d.count >= 5 ? d.whiskers[1] : 0))
                    .attr('y1', d => d.count >= 5 ? d.boxHeight * 0.25 : d.boxHeight / 2)
                    .attr('y2', d => d.count >= 5 ? d.boxHeight * 0.75 : d.boxHeight / 2)
                    .attr('opacity', d => d.count >= 5 ? 1 : 0);

                //Animate box and median line
                t.select('.box')
                    .delay(ANIMAT_DURATION * 0.5)
                    .duration(ANIMAT_DURATION * 0.25)
                    .attr('fill', colorScale(d.category))
                    .attr('x', d => xBoxScale(d.count >= 5 ? d.q1 : 0))
                    .attr('width', d => d.count >= 5 ? xBoxScale(d.q3) - xBoxScale(d.q1) : 0)
                    .attr('y', d => d.count >= 5 ? 0 : d.boxHeight / 2)
                    .attr('height', d => d.count >= 5 ? d.boxHeight : 0)
                    .attr('opacity', 1);

                t.select('.median-line')
                    .delay(ANIMAT_DURATION * 0.5)
                    .duration(ANIMAT_DURATION * 0.25)

                    .attr('x1', d => xBoxScale(d.count >= 5 ? d.median : 0))
                    .attr('x2', d => xBoxScale(d.count >= 5 ? d.median : 0))

                    .attr('y1', d => d.count >= 5 ? 0 : d.boxHeight / 2)
                    .attr('y2', d => d.count >= 5 ? d.boxHeight : d.boxHeight / 2);
            }
                
            //Fade in new outliers or small group points
            const pointtData = (d.count > 0 && d.count < 5) ? d.points : d.outliers;
            const pointtClass = (d.count > 0 && d.count < 5) ? 'small-group-point' : 'outlier';
            
            g.selectAll(`.${pointtClass}`)
                .data(pointtData)
                .enter()
                .append('circle')
                .attr('class', pointtClass)
                .attr('fill', colorScale(d.category))
                .attr('cx', p => xBoxScale(p[boxplotAttr]))
                .attr('cy', p => {
                    //Jitter for small group points
                    return pointtClass === 'small-group-point' ? 
                           d.boxHeight / 2 + (Math.random() - 0.5) * d.boxHeight * 0.8 :
                           d.boxHeight / 2;
                })
                .attr('r', 0)
                .transition(t)
                .delay(ANIMAT_DURATION * 0.75)
                .duration(ANIMAT_DURATION * 0.25)
                .attr('r', 3.5);
        });
    }

    //Run the init function
    document.addEventListener('DOMContentLoaded', init);

})();