import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Container, Button, ListGroup, Row, Col } from 'react-bootstrap';
import Stack from 'react-bootstrap/Stack';
import Badge from 'react-bootstrap/Badge';
import 'bootstrap/dist/css/bootstrap.min.css';

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
    currentImg?: ImageBitmap,
    currentImgName?: string,
    currentSample: PixelSample,
    pickedSamples: PixelSample[],
};

type PixelSampleComponentProps = {
    sample: PixelSample,
};

class PixelSampleComponent extends React.Component<PixelSampleComponentProps, any>
{

    render(): React.ReactNode {
        return <Stack direction='horizontal' gap={3}>
            <p>X={this.props.sample.pos.x}, Y={this.props.sample.pos.y}</p>
            <div className="vr" />
            <svg width={24} height={24}>
                <rect width={24} height={24}
                    fill={this.props.sample.color.hexStr()}
                    stroke='black'
                    strokeWidth={2}
                />
            </svg>
            <p>{this.props.sample.color.hexStr()}</p>
            <p>{this.props.sample.color.rgbaStr()}</p>
        </Stack>
    }

}

class App extends React.Component<any, AppState>  {

    constructor(props: any) {
        super(props);

        this.state = {
            currentSample: new PixelSample(0, 0, RGBAColor.WHITE),
            pickedSamples: [],
        };

        // TODO: load default image
        // TODO?: change mouse/cursor when dragging
        // TODO?: implement scale/zoom

    }

    async setImage(file: File): Promise<void> {
        const imageTypes = ["image/png", "image/jpeg", "image/jpg"];
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
            // TODO: ensure image dim's do not go past canvas's max
            canvas.width = this.state.currentImg!.width;
            canvas.height = this.state.currentImg!.height;
            canvas.getContext("2d")?.drawImage(this.state.currentImg!, 0, 0);
            return Promise.resolve();
        });
    }

    render(): React.ReactNode {
        return <div>
            <input
                id="myInputFile"
                type="file"
                accept="image/jpeg, image/png, image/jpg"
                style={{ display: "none" }}
                onChange={async (e) => {
                    if (e.target.files!.length > 0) {
                        let file = e.target.files!.item(0)!;
                        await this.setImage(file);
                    }
                }} />
            <Container fluid>
                <Row>
                    <Col>
                        <h1>Pixel Picker</h1>
                    </Col>
                </Row>
                <Row>
                    <Col sm={6}>
                        <PixelSampleComponent sample={this.state.currentSample} />
                    </Col>
                    <Col sm={2}>
                        <Button onClick={() => {
                            document.getElementById("myInputFile")!.click();
                        }}>Upload Image</Button>
                    </Col>
                    <Col sm={4}>
                        <h3>{this.state.currentImgName}</h3>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <canvas id="myCanvas" width="200" height="100"
                            onDrop={async (e) => {
                                // prevents file from being opened in browser
                                e.stopPropagation();
                                e.preventDefault();

                                if (e.dataTransfer.files.length > 0) {
                                    let firstFile = e.dataTransfer.files.item(0)!;
                                    if (firstFile != null) {
                                        await this.setImage(firstFile);
                                    }
                                }
                            }}
                            onDragOver={e => {
                                // prevents file from being opened in browser
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            onMouseMove={e => {
                                let canvas = e.target as HTMLCanvasElement;
                                var rect = canvas.getBoundingClientRect();
                                let mouse = {
                                    x: (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
                                    y: (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
                                };
                                mouse.x = Math.round(mouse.x);
                                mouse.y = Math.round(mouse.y);
                                // TODO: account for -1 value

                                let context = canvas.getContext("2d", { willReadFrequently: true });
                                let imgData = context!.getImageData(mouse.x, mouse.y, 1, 1)!;

                                let color = new RGBAColor(imgData.data[0], imgData.data[1], imgData.data[2], imgData.data[3]);
                                let sample = new PixelSample(mouse.x, mouse.y, color);

                                this.setState({ currentSample: sample });
                            }}
                            onMouseUp={() => {
                                let samples = this.state.pickedSamples;
                                samples.push(this.state.currentSample);
                                this.setState({ pickedSamples: samples })
                            }}
                            style={{ border: '1px solid #000000' }}>
                        </canvas>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <h3>Picked Samples</h3>
                    </Col>
                    <Col>
                        {this.state.pickedSamples.length > 0 &&
                            <Button variant='danger'
                                onClick={() => this.setState({ pickedSamples: [] })}>Clear All</Button>
                        }
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <ListGroup numbered variant='flush'>
                            {this.state.pickedSamples.map((sample, idx) =>
                                <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-start">
                                    <PixelSampleComponent sample={sample} />
                                    <Badge
                                        onClick={() => {
                                            let samples = this.state.pickedSamples;
                                            samples.splice(idx, 1);
                                            this.setState({ pickedSamples: samples });
                                        }}
                                        bg="danger"
                                        pill>X</Badge>
                                </ListGroup.Item>
                            )}
                        </ListGroup>
                    </Col>
                    <Col sm={5}></Col>
                </Row>
            </Container>
        </div>
    }

}

(document.getElementsByTagName("body")[0] as Element).innerHTML = "<div id='react-app'></div>";
const reactAppElement = document.getElementById('react-app') as Element;
createRoot(reactAppElement).render(<React.StrictMode><App /></React.StrictMode>);
