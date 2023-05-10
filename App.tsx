import * as React from 'react';
import { createRoot } from 'react-dom/client';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import ListGroup from 'react-bootstrap/ListGroup';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import * as Icon from 'react-bootstrap-icons';
import 'bootswatch/dist/darkly/bootstrap.min.css';

// webpack replaces with package.json verison
declare const __VERSION__: string;

// supported mime types
const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

class RGBAColor {
    static readonly WHITE = new RGBAColor(0, 0, 0, 255);
    r: number = 0;
    g: number = 0;
    b: number = 0;
    a: number = 255;

    constructor(r: number, g: number, b: number, a: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    rgbaStr(): string {
        // 'a' value in rgba() format is represented as a decimal
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${Math.round(this.a / 255 * 100) / 100})`;
    }

    private toHexStr(num: number, padding: number = 2) {
        let hex = num.toString(16).toUpperCase();
        while (hex.length < padding) {
            hex = "0" + hex;
        }
        return hex;
    }

    hexStr(): string {
        return `#${this.toHexStr(this.r)}${this.toHexStr(this.g)}${this.toHexStr(this.b)}`;
    }
}

class PixelSample {
    pos: { x: number, y: number };
    color: RGBAColor;

    constructor(posX: number, posY: number, color: RGBAColor) {
        this.pos = { x: posX, y: posY };
        this.color = color;
    }
}

type AppState = {
    currentImg?: ImageBitmap;
    currentImgName?: string;
    currentSample: PixelSample;
    pickedSamples: PixelSample[];
    dragging: boolean;
    sortToggle: boolean;
};

type PixelSampleComponentProps = {
    sample: PixelSample;
};

class PixelSampleComponent extends React.Component<PixelSampleComponentProps, any>
{

    render(): React.ReactNode {
        return <Stack direction="horizontal" style={{ height: '4rem' }}>
            <div style={{ paddingRight: '1rem' }}>
                <svg width={'2rem'} height={'2rem'}>
                    <rect width={'2rem'} height={'2rem'}
                        fill={this.props.sample.color.hexStr()}
                        stroke='black'
                        strokeWidth={2}
                    />
                </svg>
            </div>
            <div style={{ width: '5em' }}>
                {this.props.sample.color.hexStr()}
                <br />
                X={this.props.sample.pos.x}
            </div>
            <div>
                {this.props.sample.color.rgbaStr()}
                <br />
                Y={this.props.sample.pos.y}
            </div>
        </Stack>
    }

}

class App extends React.Component<any, AppState>  {

    constructor(props: any) {
        super(props);

        this.state = {
            currentSample: new PixelSample(0, 0, RGBAColor.WHITE),
            pickedSamples: [],
            dragging: false,
            sortToggle: false,
        };
    }

    setImage = async (file: File): Promise<void> => {
        if (!imageTypes.includes(file.type)) {
            // unsupported file mime type
            console.error("Bad or unsupported file type: %s", file.type);
            return Promise.resolve();
        }

        let canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
        let buf = await file.arrayBuffer();
        let img = await createImageBitmap(new Blob([buf]));
        if (!img) {
            console.error("Unable to load image");
            return Promise.resolve();
        }
        if (this.state.currentImg) {
            this.state.currentImg!.close();
        }
        this.setState({ currentImg: img, currentImgName: file.name }, () => {
            canvas.width = this.state.currentImg!.width;
            canvas.height = this.state.currentImg!.height;
            let ctx = canvas.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(this.state.currentImg!, 0, 0);
            document.title = `Pixel Picker - '${file.name}'`;
            return Promise.resolve();
        });
    }

    exportPointsToJSON = (): void => {
        let data = JSON.stringify(this.state.pickedSamples);
        let blob = new Blob([data], { type: 'text/json;charset=utf-8' })

        // Save file... don't use new, experimental API 'showSaveFilePicker'
        // instead, create a link HTML element and 'click' it to download
        let blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.target = "_blank";
        anchor.download = "points.json";

        // Trigger the file download
        anchor.click();

        // Release the blobUrl that was created
        URL.revokeObjectURL(blobUrl);
    }

    onDrop = async (e: React.DragEvent<HTMLElement>): Promise<void> => {
        // prevents file from being opened by browser
        e.stopPropagation();
        e.preventDefault();

        this.setState({ dragging: false });
        if (e.dataTransfer.files.length > 0) {
            let firstFile = e.dataTransfer.files.item(0)!;
            if (firstFile != null) {
                await this.setImage(firstFile);
            }
        }

        return Promise.resolve();
    }

    onDragOver = (e: React.DragEvent<HTMLElement>): void => {
        // prevents file from being opened by browser
        e.stopPropagation();
        e.preventDefault();
    }

    sampleCanvas = (e: React.MouseEvent<HTMLElement>): void => {
        let canvas = e.target as HTMLCanvasElement;
        var rect = canvas.getBoundingClientRect();
        let mouse = {
            x: (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
            y: (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
        };
        mouse.x = Math.max(0, Math.round(mouse.x));
        mouse.y = Math.max(0, Math.round(mouse.y));

        let context = canvas.getContext("2d", { willReadFrequently: true });
        let imgData = context!.getImageData(mouse.x, mouse.y, 1, 1)!;

        let color = new RGBAColor(imgData.data[0], imgData.data[1], imgData.data[2], imgData.data[3]);
        let sample = new PixelSample(mouse.x, mouse.y, color);

        this.setState({ currentSample: sample });
    }

    pickSample = (_e: React.MouseEvent<HTMLElement>): void => {
        let samples = this.state.pickedSamples;
        samples.push(this.state.currentSample);
        this.setState({ pickedSamples: samples })
    }

    render(): React.ReactNode {
        return <div>
            <Navbar bg="primary">
                <Container fluid>
                    <div className="font-monospace">
                        <h3>Pixel Picker <small className="text-muted">{__VERSION__}</small></h3>
                    </div>
                    <Navbar.Toggle />
                    <input
                        id="myInputFile"
                        type="file"
                        accept={imageTypes.reduce((a, val) => `${a}, ${val}`)}
                        style={{ display: "none" }}
                        onChange={async (e) => {
                            if (e.target.files!.length > 0) {
                                let file = e.target.files!.item(0)!;
                                await this.setImage(file);
                            }
                        }} />
                    <Button className='btn-secondary'
                        onClick={() => { document.getElementById("myInputFile")!.click(); }}>
                        Upload Image
                    </Button>
                </Container>
            </Navbar>
            <Container fluid>
                <Row style={{ paddingTop: '1rem' }}>
                    <Col md={8}>
                        {!this.state.currentImg && <div
                            onDrop={this.onDrop}
                            onDragOver={this.onDragOver}
                            style={{
                                height: '50vh',
                                border: '2px dashed',
                                marginBottom: '1rem',
                            }}>
                            <h3 style={{
                                marginTop: 'calc(25vh - 0.5em)',
                                textAlign: 'center',
                            }}>
                                Drop or Upload Image
                            </h3>
                        </div>}
                        <div
                            hidden={this.state.currentImg == undefined}
                            className='overflow-auto'
                            style={{
                                cursor: 'crosshair',
                                textAlign: 'center',
                                maxHeight: '90vh',
                                overflow: 'scroll',
                                marginBottom: '1rem',
                            }}>
                            <canvas id="myCanvas"
                                onDrop={this.onDrop}
                                onDragOver={this.onDragOver}
                                onDragEnter={() => this.setState({ dragging: true })}
                                onDragLeave={() => this.setState({ dragging: false })}
                                onMouseMove={this.sampleCanvas}
                                onMouseUp={this.pickSample}
                                style={{
                                    border: this.state.dragging ?
                                        '2px dashed white' : '2px solid white'
                                }}
                            />
                        </div>
                    </Col>
                    <Col md={4}>
                        <Card style={{ height: '85vh' }}>
                            <Card.Header className="d-flex justify-content-between">
                                <Card.Title style={{ paddingTop: '0.5em' }}>Picked Samples</Card.Title>
                                <ButtonGroup>
                                    <Button variant='primary'
                                        disabled={this.state.pickedSamples.length == 0}
                                        onClick={() => {
                                            this.setState({ sortToggle: !this.state.sortToggle });
                                        }}>
                                        {!this.state.sortToggle && <Icon.ArrowDown size={20} />}
                                        {this.state.sortToggle && <Icon.ArrowUp size={20} />}
                                    </Button>
                                    <Button variant='primary'
                                        disabled={this.state.pickedSamples.length == 0}
                                        onClick={() => this.exportPointsToJSON()}>
                                        <Icon.Download style={{ marginRight: '0.5rem' }} size={20} />
                                        JSON
                                    </Button>
                                    <Button variant='danger'
                                        disabled={this.state.pickedSamples.length == 0}
                                        onClick={() => this.setState({ pickedSamples: [] })}>
                                        <Icon.Trash style={{ marginRight: '0.5rem' }} size={20} />
                                        {this.state.pickedSamples.length}
                                    </Button>
                                </ButtonGroup>
                            </Card.Header>
                            <Card.Body>
                                <ListGroup>
                                    <ListGroup.Item active>
                                        <PixelSampleComponent sample={this.state.currentSample} />
                                    </ListGroup.Item>
                                </ListGroup>
                                <ListGroup
                                    variant='flush'
                                    className='overflow-auto'
                                    style={{
                                        overflowY: 'scroll',
                                        paddingTop: '1rem',
                                        height: 'calc(85vh - 200px)'
                                    }}>
                                    {(this.state.sortToggle ?
                                        this.state.pickedSamples.slice(0).reverse() :
                                        this.state.pickedSamples).map((sample, idx) =>
                                            <ListGroup.Item key={idx}>
                                                <Stack direction='horizontal'>
                                                    <div>
                                                        <PixelSampleComponent sample={sample} />
                                                    </div>
                                                    <div className='ms-auto'>
                                                        <Button
                                                            style={{ width: '3rem', height: '3rem' }}
                                                            onClick={() => {
                                                                let samples = this.state.pickedSamples;
                                                                samples.splice(idx, 1);
                                                                this.setState({ pickedSamples: samples });
                                                            }}
                                                            variant="danger">
                                                            <Icon.XLg size={20} />
                                                        </Button>
                                                    </div>
                                                </Stack>
                                            </ListGroup.Item>
                                        )
                                    }
                                </ListGroup>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    }

}

// insert <div> to render the React App to
const body = (document.getElementsByTagName("body")[0] as HTMLBodyElement);
body.innerHTML = "<div id='react-app'></div>";

const reactAppElement = document.getElementById('react-app') as Element;
createRoot(reactAppElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
