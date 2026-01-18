//ASURITE ID - pnidagun

const vowels = new Set("aeiouy");
const consonants = new Set("bcdfghjklmnpqrstvwxz");
const puncts = new Set(".,!?:;");

const group_name = { vowel:"Vowels", consonant:"Consonants", punct:"Punctuation" };

const colorByGroup = d3.scaleOrdinal()

  .domain([group_name.vowel, group_name.consonant, group_name.punct])
  .range(["#f5f19a", "#9ed5ce", "#b9a7d6"]);  

const treeMap_Svg = d3.select("#treemap_svg");
const sankey_Svg  = d3.select("#sankey_svg");
const tool_Tip    = d3.select("#tooltip");

const treemapMargin = {top:18, bottom:18, left:18, right:18};
const sankeyMargin  = {top:18, bottom:18, left:18, right:18};

//function to identify vowel, consonant or punctuation
function groupOfChar(ch)
{
  if (vowels.has(ch))     
    return group_name.vowel;

  if (consonants.has(ch)) 
    return group_name.consonant;

  if (puncts.has(ch))     
    return group_name.punct;
}

//fucntion to check for valid character
function isValidChar(ch){ 
    return groupOfChar(ch) != null; 
}

//function for sanitizing input text
function sanitize(text){
  const res = [];
  for (const raw of text.toLowerCase())
    {
    if (isValidChar(raw)) res.push(raw);
   }
  return res;
}

//function to count the characters
function countTheChars(chars){

  const mp = new Map();
  for (const cr of chars) mp.set(cr, (mp.get(cr) || 0) + 1);
  return mp;

}

//function for TreeMap to convert counts to hierarchy
function toHierarchyTreemap(counts){
  const bucket = {
    [group_name.vowel]:[], [group_name.consonant]:[], [group_name.punct]:[]
  };

  for (const [ch,val] of counts.entries()){
    bucket[groupOfChar(ch)].push({name:ch, value:val});
  }

  const children = Object.entries(bucket)
    .filter(([,arr]) => arr.length)
    .map(([name, children]) => ({name, children}));
  return {name:"root", children};
}

//function to render input text
function renderInput(plainText){
  const textbox = document.getElementById("input_text");
  textbox.innerHTML = ""; 

  for (const ch of plainText)
    {
    const s = ch.toLowerCase();
    if (isValidChar(s))
    {
      const spans = document.createElement("spans");
      spans.setAttribute("data-ch", s);
      spans.textContent = ch;
      textbox.appendChild(spans);
    } 
    else if (ch === "\n")
    {
      textbox.appendChild(document.createElement("br"));
    } 
    else 
    {
      textbox.appendChild(document.createTextNode(ch));
    }
  }
}

//fucntion for character highlighting
function hiliteOn(ch)
{
  d3.selectAll(`[data-ch="${CSS.escape(ch)}"]`).classed("text-highlight highlighted", true);
}

//function to remove character highlighting
function hiliteOff()
{
  d3.selectAll(".text-highlight").classed("text-highlight", false);
  d3.selectAll(".highlighted").classed("highlighted", false);
}

// Chart - TreeMap 
function TreeMapDraw(hierarchy, onCharClick){
  treeMap_Svg.selectAll("*").remove();

  const {width, height} = treeMap_Svg.node().getBoundingClientRect();
  const innerWidth = width  - treemapMargin.left - treemapMargin.right;
  const innerHeight = height - treemapMargin.top  - treemapMargin.bottom;

  const roots = d3.hierarchy(hierarchy).sum(d => d.value || 0);

  const tileOfRoot = (node, x0, y0, x1, y1) => {
    if (!node.children) 
        return;

    if (node.depth !== 0)
        { 
            d3.treemapBinary(node, x0, y0, x1, y1); 
            return; 
        }

    const byTheName = new Map(node.children.map(c => [c.data.name, c]));
    const vow  = byTheName.get(group_name.vowel);
    const cons = byTheName.get(group_name.consonant);
    const punct = byTheName.get(group_name.punct);

    const w0 = x1 - x0, h = y1 - y0;
    const total = (vow?.value || 0) + (cons?.value || 0) + (punct?.value || 0);
    const p_w = total ? w0 * ((punct?.value || 0) / total) : 0;
    const splitX = x1 - p_w;

    const left_X1  = splitX;
    const right_X0 = splitX;

    const vcTheTotal = (vow?.value || 0) + (cons?.value || 0);
    const v_H = vcTheTotal ? h * ((vow?.value || 0) / vcTheTotal) : 0;
    const v_Y1 = y0 + v_H;
    const c_Y0 = v_Y1;

    if (vow)  
        { 
            vow.x0=x0; vow.y0=y0;  
            vow.x1=left_X1; vow.y1=v_Y1; 
        }
    if (cons) 
        { 
            cons.x0=x0; 
            cons.y0=c_Y0; 
            cons.x1=left_X1; 
            cons.y1=y1; 
        }
    if (punct)
        { 
            punct.x0=right_X0; 
            punct.y0=y0; 
            punct.x1=x1; 
            punct.y1=y1; 
        }
  };

  d3.treemap()
    .size([innerWidth, innerHeight])
    .tile(tileOfRoot)
    .paddingInner(2)
    .paddingOuter(d => d.depth === 1 ? 0 : 2)                            
    (roots);

  const g = treeMap_Svg.append("g")
    .attr("transform", `translate(${treemapMargin.left},${treemapMargin.top})`);

  const nodes = g.selectAll("g.node")
    .data(roots.leaves())
    .join("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  nodes.append("rect")
    .attr("data-ch", d => d.data.name)
    .attr("width",  d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill",   d => colorByGroup(d.parent.data.name))
    .attr("stroke-width", 1)
    .attr("stroke", "#000")
    
    .on("mouseover", (event, d) => {
      tool_Tip.style("display","block")
             .html(`Character: ${d.data.name}<br>Count: ${d.data.value}`);
      hiliteOn(d.data.name);
    })

    .on("mousemove", (e) => {
      tool_Tip.style("left",(e.clientX+12)+"px").style("top",(e.clientY+12)+"px");
    })

    .on("mouseout", () => { tool_Tip.style("display","none"); hiliteOff(); })
    .on("click", (e,d) => onCharClick(d.data.name));
}

// Chart - Sankey Diagram
function sankeyDraw(target, chars)
{
  sankey_Svg.selectAll("*").remove();
  d3.select("#flow_label").text(`Character flow for '${target}'`);

  const {width,height} = sankey_Svg.node().getBoundingClientRect();
  const innerWidth = width  - sankeyMargin.left - sankeyMargin.right;
  const innerHeight = height - sankeyMargin.top  - sankeyMargin.bottom;

  const neighborsTo = (chars, t) =>
    {
    const left = new Map(), right = new Map();
    let total = 0;
    for (let i=0;i<chars.length;i++)
        {
      if (chars[i] !== t) 
        continue;
      total++;
      if (i>0)               
        left.set(chars[i-1], (left.get(chars[i-1]) || 0) + 1);
      if (i<chars.length-1) 
        right.set(chars[i+1], (right.get(chars[i+1]) || 0) + 1);
    }
    return {left,right,count:total};
  };

  const {left,right,count} = neighborsTo(chars, target);

  const center_Id = `C_${target}`;
  const nodes = [{id:center_Id, label:target, group:groupOfChar(target)}];

  for (const [ch] of left)  
    nodes.push({id:`L_${ch}`, label:ch, group:groupOfChar(ch)});

  for (const [ch] of right) 
    nodes.push({id:`R_${ch}`, label:ch, group:groupOfChar(ch)});

  const links = [
    ...Array.from(left,  ([ch,val]) => ({source:`L_${ch}`, target:center_Id, value:val})),
    ...Array.from(right, ([ch,val]) => ({source:center_Id, target:`R_${ch}`, value:val}))
  ];

  const sankey = d3.sankey()
    .nodeId(d => d.id)
    .nodePadding(10)
    .nodeWidth(16)
    .extent([[sankeyMargin.left, sankeyMargin.top], [innerWidth, innerHeight]]);

  const graph = sankey({
    nodes: nodes.map(d => ({...d})),
    links: links.map(d => ({...d}))
  });

  sankey_Svg.append("g")
    .attr("fill","none")
    .selectAll("path")
    .data(graph.links)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("opacity", 0.7)
    .attr("stroke","#aaa")
    .attr("stroke-width", d => Math.max(1, d.width));

  const ng = sankey_Svg.append("g")
    .selectAll("g")
    .data(graph.nodes)
    .join("g");

  ng.append("rect")
    .attr("data-ch", d => d.label)
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => Math.max(1, d.y1 - d.y0))
    .attr("width",  d => d.x1 - d.x0)
    .attr("rx",4).attr("ry",4)
    .attr("fill", d => colorByGroup(d.group))
    .attr("stroke","#000").attr("stroke-width",1)

    .on("mouseover", (event, d) => {
      let text;
      if (d.id.startsWith("L_")){
        const link = graph.links.find(l => l.source.id === d.id && l.target.id === center_Id);
        text = `Character '${d.label}' flows into '${target}' ${link ? link.value : 0} times.`;
      } else if (d.id.startsWith("R_")){
        const link = graph.links.find(l => l.source.id === center_Id && l.target.id === d.id);
        text = `Character '${target}' flows into '${d.label}' ${link ? link.value : 0} times.`;
      } else {
        text = `Character '${target}' appears ${count} times.`;
      }
      tool_Tip.style("display","block").text(text);
      hiliteOn(d.label);

    })

    .on("mousemove", (e) => {
      tool_Tip.style("left",(e.clientX+12)+"px").style("top",(e.clientY+12)+"px");
    })
    .on("mouseout", () => { tool_Tip.style("display","none"); hiliteOff(); });

  // Label - Sankey Diagram Nodes
  const labelOffset = 6;
  ng.append("text")
    .attr("x", d => d.x0 - labelOffset)
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .style("pointer-events","none")
    .style("font-size","12px")
    .style("font-weight","600")
    .attr("fill","#000")
    .text(d => d.label);
}

// Syncing the Submit button with the TreeMap and Sankey Diagram
document.getElementById("submit_button").addEventListener("click", () => {

  const plain = document.getElementById("input_text").textContent || "";

  renderInput(plain);

  const chars = sanitize(plain);
  
  if (!chars.length)
    {

    treeMap_Svg.selectAll("*").remove();
    sankey_Svg.selectAll("*").remove();

    d3.select("#flow_label").text("Character flow for ...");

    return;
  }

  const counts = countTheChars(chars);
  const hierarchy = toHierarchyTreemap(counts);

  TreeMapDraw(hierarchy, (ch) => sankeyDraw(ch, chars));

  // Clearing the Sankey Chart
  sankey_Svg.selectAll("*").remove();
  d3.select("#flow_label").text("Character flow for ...");
});