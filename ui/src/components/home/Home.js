import React from 'react';
import { connect } from 'react-redux';

import { Tab, Grid } from 'semantic-ui-react';

import { startFetchResults, stopFetchResults } from "epics/auto-fetch-results-epic"
import { fetchResults } from 'epics/fetch-results-epic'
import { fetchToolStatus } from 'epics/fetch-status-epic'
import { fetchTools } from 'epics/fetch-tools-epic'
import { setPacketStatisticsData,  getDataWranglingState, configureHeatmapData } from 'domain/data_wrangling';
import { setSessionId, setFileId, getResults, getToolStatuses, getToolResults } from 'domain/data';

import './Home.css';
import Upload from 'components/upload/Upload';
import DataMonitor from 'components/data/DataMonitor';
import VisualizationPane from 'components/pane/VisualizationPane';

import pcapStatsData from 'components/pcapstats/data.json';

const formatHeatmapData = (files, results) => {
    const selectedFile = files.length > 0 ? files[0].id : "";
    const statusArray = !results[selectedFile] ? [] : Object.keys(results[selectedFile]).map(key => ({
      tool: String(key), 
      id: selectedFile,
      results: results[selectedFile][key]
    })) 

    const mercury = statusArray.filter((data)=>{
        return data.tool === "mercury"
    })

    const mercuryResults = mercury.length > 0 && mercury[0].results.length > 0 ? mercury[0].results[0] : []; 
    var ipData = {
      type:"ip",
      // data:jsonData[0],
      data:mercuryResults,
      firstKey:"dst_ip",
      secondKey:"src_ip"
    }

    ipData = configureHeatmapData(ipData)

    var portData = {
      type:"port",
      // data:jsonData[0],
      data: mercuryResults,
      firstKey:"dst_port",
      secondKey:"src_port"
    }

    portData = configureHeatmapData(portData)

    return { 'ipResults': ipData, 'portResults': portData }
}

class Home extends React.Component {

  constructor(props) {
    super(props);
  
    this.state = {
      ipResults:null,
      portResults: null,
      packetStats:null
    };
  }


  componentDidMount(){
    this.props.fetchTools();
    this.fetchStatsData()
  }

  static getDerivedStateFromProps(props, state) {
    // Any time the current user changes,
    // Reset any parts of state that are tied to that user.
    // In this simple example, that's just the email.
    const { vizData } = props;
    const hmData = formatHeatmapData(props.files, props.results);

    if (hmData !== state.vizData) {
      return {
        ipResults: hmData.ipResults,
        portResults: hmData.portResults,
        packetStats: vizData.packetstats
      };
    }
  }

  getPanes = () => {
    return this.props.files.map((file) =>{
      return {
        menuItem: {"id":file.id, "name":file.filename},
        render: () =>
          <Tab.Pane attached={true}>
            <VisualizationPane sessionId={this.state.sessionId} fileId={file.id} files={this.props.files} results={this.props.results} clearResults={this.clearResults}/>
          </Tab.Pane>
      }
    })
  }

  handlePaneChange = (e, data) => {
    const fileId = data.panes[data.activeIndex].menuItem.id;
    this.props.setFileId(fileId);
  }

  componentWillUnmount() {
    this.props.stopFetchResults();
  }

  fetchStatsData = async () => {
    const { setPacketStatisticsData } = this.props;

    const tsharkObject = pcapStatsData[0]['tshark'];

    setPacketStatisticsData(tsharkObject);
  }
  
  render() {
    const refreshInterval = this.props.refreshInterval 

    return (
      <>
        <Grid textAlign='center' container style={{ height: '85vh' }}>
          <Grid.Row columns={1}>
            <Grid.Column style={{ maxWidth: 240 }}>
              <Upload sessionId={this.props.sessionId} refreshInterval={refreshInterval}/>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row columns={1}>
            <Grid.Column>
              <DataMonitor sessionId={this.props.sessionId} files={this.props.files} statuses={this.props.statuses} refreshInterval={refreshInterval}/>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row columns={1}>
            <Tab menu={{ secondary: true }} panes={this.getPanes()} onTabChange={this.handlePaneChange} />
          </Grid.Row>
        </Grid>
      </>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const results = getResults(state);
  const toolStatuses = getToolStatuses(state);
  const toolResults = getToolResults(state);
  const wrangledData = getDataWranglingState(state);

  return{
    files: results.rows || [],
    statuses: toolStatuses || {},
    results: toolResults || {},
    vizData: wrangledData || {},
  }
};

const mapDispatchToProps = {
    setSessionId,
    setFileId,
    fetchResults,
    fetchToolStatus,
    fetchTools,
    startFetchResults,
    stopFetchResults,
    setPacketStatisticsData
};

export default connect(mapStateToProps, mapDispatchToProps)(Home);